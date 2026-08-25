import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const STORE_VERSION = 1 as const;
const TOKEN_PREFIX = 'mcpk';
const KEY_ID_PATTERN = /^[0-9a-f]{16}$/;
const TOKEN_PATTERN = /^mcpk_([0-9a-f]{16})_([A-Za-z0-9_-]{43})$/;
const DEFAULT_SCOPES = ['mcp'] as const;
const MAX_KEY_ID_ATTEMPTS = 16;

export interface ApiKeyMetadata {
  id: string;
  label: string;
  subject?: string;
  scopes: readonly string[];
  serverIds?: readonly string[];
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  replacedBy?: string;
}

interface StoredApiKey extends ApiKeyMetadata {
  tokenHash: string;
}

interface StoreDocument {
  version: typeof STORE_VERSION;
  keys: StoredApiKey[];
}

export interface CreateApiKeyInput {
  label: string;
  subject?: string;
  scopes?: readonly string[];
  serverIds?: readonly string[];
  expiresAt?: Date;
}

export interface IssuedApiKey {
  token: string;
  key: ApiKeyMetadata;
}

export interface RotateApiKeyOptions {
  graceSeconds?: number;
}

export interface RotatedApiKey extends IssuedApiKey {
  previous: ApiKeyMetadata;
}

export interface VerifyApiKeyOptions {
  now?: Date;
}

export class ApiKeyStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyStoreError';
  }
}

function cloneMetadata(key: StoredApiKey): ApiKeyMetadata {
  return Object.freeze({
    id: key.id,
    label: key.label,
    ...(key.subject ? { subject: key.subject } : {}),
    scopes: Object.freeze([...key.scopes]),
    ...(key.serverIds ? { serverIds: Object.freeze([...key.serverIds]) } : {}),
    createdAt: key.createdAt,
    ...(key.expiresAt ? { expiresAt: key.expiresAt } : {}),
    ...(key.revokedAt ? { revokedAt: key.revokedAt } : {}),
    ...(key.replacedBy ? { replacedBy: key.replacedBy } : {}),
  });
}

function normalizeList(values: readonly string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined;
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function validateCreateInput(input: CreateApiKeyInput): void {
  if (!input.label.trim()) {
    throw new ApiKeyStoreError('API key label is required');
  }
  if (input.expiresAt && !Number.isFinite(input.expiresAt.getTime())) {
    throw new ApiKeyStoreError('API key expiration is invalid');
  }
}

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest();
}

function secureToken(): { id: string; token: string } {
  const id = randomBytes(8).toString('hex');
  const secret = randomBytes(32).toString('base64url');
  return { id, token: `${TOKEN_PREFIX}_${id}_${secret}` };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function optionalString(value: Record<string, unknown>, name: string): string | undefined {
  const current = value[name];
  if (current === undefined) return undefined;
  if (typeof current !== 'string') {
    throw new ApiKeyStoreError(`API key store contains invalid ${name}`);
  }
  return current;
}

function parseStoredKey(value: unknown): StoredApiKey {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiKeyStoreError('API key store contains an invalid key record');
  }
  const key = value as Record<string, unknown>;
  if (
    typeof key.id !== 'string' || !KEY_ID_PATTERN.test(key.id)
    || typeof key.label !== 'string' || !key.label.trim()
    || typeof key.tokenHash !== 'string'
    || typeof key.createdAt !== 'string'
    || !isStringArray(key.scopes)
  ) {
    throw new ApiKeyStoreError('API key store contains an invalid key record');
  }
  if (key.serverIds !== undefined && !isStringArray(key.serverIds)) {
    throw new ApiKeyStoreError('API key store contains invalid serverIds');
  }
  const subject = optionalString(key, 'subject');
  const expiresAt = optionalString(key, 'expiresAt');
  const revokedAt = optionalString(key, 'revokedAt');
  const replacedBy = optionalString(key, 'replacedBy');
  return {
    id: key.id,
    label: key.label,
    tokenHash: key.tokenHash,
    scopes: [...key.scopes],
    ...(key.serverIds ? { serverIds: [...key.serverIds] as string[] } : {}),
    createdAt: key.createdAt,
    ...(subject ? { subject } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(revokedAt ? { revokedAt } : {}),
    ...(replacedBy ? { replacedBy } : {}),
  };
}

function parseDocument(value: unknown): StoreDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiKeyStoreError('API key store is not a JSON object');
  }
  const document = value as Record<string, unknown>;
  if (document.version !== STORE_VERSION || !Array.isArray(document.keys)) {
    throw new ApiKeyStoreError(`Unsupported API key store format; expected version ${STORE_VERSION}`);
  }
  return { version: STORE_VERSION, keys: document.keys.map(parseStoredKey) };
}

function activeAt(key: StoredApiKey, now: Date): boolean {
  if (key.revokedAt) return false;
  return !key.expiresAt || Date.parse(key.expiresAt) > now.getTime();
}

function earlierExpiration(existing: string | undefined, candidate: Date): string {
  if (!existing) return candidate.toISOString();
  const existingTime = Date.parse(existing);
  return existingTime <= candidate.getTime() ? existing : candidate.toISOString();
}

export class FileApiKeyStore {
  readonly path: string;

  constructor(path: string) {
    if (!path.trim()) throw new ApiKeyStoreError('API key store path is required');
    this.path = path;
  }

  async list(): Promise<readonly ApiKeyMetadata[]> {
    const document = await this.readDocument();
    return Object.freeze(document.keys.map(cloneMetadata));
  }

  async create(input: CreateApiKeyInput): Promise<IssuedApiKey> {
    validateCreateInput(input);
    return await this.withWriteLock(async () => {
      const document = await this.readDocument();
      const issued = this.issue(document, input, new Date());
      await this.writeDocument(document);
      return issued;
    });
  }

  async verify(token: string, options: VerifyApiKeyOptions = {}): Promise<ApiKeyMetadata | undefined> {
    const match = TOKEN_PATTERN.exec(token);
    const id = match?.[1];
    if (!id) return undefined;
    const document = await this.readDocument();
    const key = document.keys.find(candidate => candidate.id === id);
    if (!key || !activeAt(key, options.now ?? new Date())) return undefined;

    const expected = Buffer.from(key.tokenHash, 'base64url');
    const actual = hashToken(token);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return undefined;
    return cloneMetadata(key);
  }

  async revoke(id: string): Promise<ApiKeyMetadata> {
    return await this.withWriteLock(async () => {
      const document = await this.readDocument();
      const key = document.keys.find(candidate => candidate.id === id);
      if (!key) throw new ApiKeyStoreError(`API key not found: ${id}`);
      if (!key.revokedAt) key.revokedAt = new Date().toISOString();
      await this.writeDocument(document);
      return cloneMetadata(key);
    });
  }

  async rotate(id: string, options: RotateApiKeyOptions = {}): Promise<RotatedApiKey> {
    const graceSeconds = options.graceSeconds ?? 0;
    if (!Number.isFinite(graceSeconds) || graceSeconds < 0) {
      throw new ApiKeyStoreError('Rotation graceSeconds must be a non-negative number');
    }

    return await this.withWriteLock(async () => {
      const document = await this.readDocument();
      const previous = document.keys.find(candidate => candidate.id === id);
      if (!previous) throw new ApiKeyStoreError(`API key not found: ${id}`);
      if (previous.revokedAt) throw new ApiKeyStoreError(`API key is already revoked: ${id}`);
      if (previous.replacedBy) throw new ApiKeyStoreError(`API key has already been rotated: ${id}`);

      const now = new Date();
      if (previous.expiresAt && Date.parse(previous.expiresAt) <= now.getTime()) {
        throw new ApiKeyStoreError(`API key is expired and cannot be rotated: ${id}`);
      }

      const issued = this.issue(document, {
        label: previous.label,
        ...(previous.subject ? { subject: previous.subject } : {}),
        scopes: previous.scopes,
        ...(previous.serverIds ? { serverIds: previous.serverIds } : {}),
        ...(previous.expiresAt ? { expiresAt: new Date(previous.expiresAt) } : {}),
      }, now);
      previous.replacedBy = issued.key.id;
      if (graceSeconds === 0) {
        previous.revokedAt = now.toISOString();
      } else {
        previous.expiresAt = earlierExpiration(previous.expiresAt, new Date(now.getTime() + graceSeconds * 1000));
      }
      await this.writeDocument(document);
      return { ...issued, previous: cloneMetadata(previous) };
    });
  }

  private issue(document: StoreDocument, input: CreateApiKeyInput, now: Date): IssuedApiKey {
    let generated: { id: string; token: string } | undefined;
    for (let attempt = 0; attempt < MAX_KEY_ID_ATTEMPTS; attempt += 1) {
      const candidate = secureToken();
      if (!document.keys.some(key => key.id === candidate.id)) {
        generated = candidate;
        break;
      }
    }
    if (!generated) {
      throw new ApiKeyStoreError('Failed to allocate a unique API key id');
    }

    const { id, token } = generated;
    const scopes = normalizeList(input.scopes) ?? [...DEFAULT_SCOPES];
    const serverIds = normalizeList(input.serverIds);
    const stored: StoredApiKey = {
      id,
      label: input.label.trim(),
      tokenHash: hashToken(token).toString('base64url'),
      scopes,
      createdAt: now.toISOString(),
      ...(input.subject?.trim() ? { subject: input.subject.trim() } : {}),
      ...(serverIds ? { serverIds } : {}),
      ...(input.expiresAt ? { expiresAt: input.expiresAt.toISOString() } : {}),
    };
    document.keys.push(stored);
    return { token, key: cloneMetadata(stored) };
  }

  private async readDocument(): Promise<StoreDocument> {
    let raw: string;
    try {
      raw = await readFile(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { version: STORE_VERSION, keys: [] };
      }
      throw error;
    }
    try {
      return parseDocument(JSON.parse(raw) as unknown);
    } catch (error) {
      if (error instanceof ApiKeyStoreError) throw error;
      throw new ApiKeyStoreError(`Failed to parse API key store ${this.path}: ${String(error)}`);
    }
  }

  private async writeDocument(document: StoreDocument): Promise<void> {
    const directory = dirname(this.path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    const content = `${JSON.stringify(document, null, 2)}\n`;
    try {
      await writeFile(temporary, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      await rename(temporary, this.path);
      await chmod(this.path, 0o600).catch(() => undefined);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
  }

  private async withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const directory = dirname(this.path);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const lockPath = `${this.path}.lock`;
    let handle: Awaited<ReturnType<typeof open>> | undefined;

    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        handle = await open(lockPath, 'wx', 0o600);
        await handle.writeFile(`${process.pid}\n${new Date().toISOString()}\n`);
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        try {
          const info = await stat(lockPath);
          if (Date.now() - info.mtimeMs > 30_000) {
            await unlink(lockPath).catch(() => undefined);
            continue;
          }
        } catch {
          continue;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    if (!handle) {
      throw new ApiKeyStoreError(`Timed out waiting for API key store lock: ${lockPath}`);
    }

    try {
      return await operation();
    } finally {
      await handle.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
    }
  }
}

export function apiKeyAllowsServer(key: ApiKeyMetadata, serverId: string): boolean {
  return !key.serverIds || key.serverIds.includes(serverId);
}
