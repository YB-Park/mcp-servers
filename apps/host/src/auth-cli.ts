import { FileApiKeyStore, type ApiKeyMetadata } from '@mcp-platform/runtime';

interface ParsedArgs {
  command?: string;
  positionals: string[];
  options: Map<string, string[]>;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const options = new Map<string, string[]>();

  for (let index = 0; index < rest.length; index += 1) {
    const current = rest[index];
    if (!current) continue;
    if (!current.startsWith('--')) {
      positionals.push(current);
      continue;
    }
    const name = current.slice(2);
    const next = rest[index + 1];
    const value = next && !next.startsWith('--') ? next : 'true';
    if (value !== 'true') index += 1;
    options.set(name, [...(options.get(name) ?? []), value]);
  }
  return { command, positionals, options };
}

function one(args: ParsedArgs, name: string): string | undefined {
  return args.options.get(name)?.at(-1);
}

function csv(args: ParsedArgs, name: string): string[] | undefined {
  const values = args.options.get(name)?.flatMap(value => value.split(',').map(item => item.trim()).filter(Boolean));
  return values?.length ? values : undefined;
}

function integer(args: ParsedArgs, name: string): number | undefined {
  const value = one(args, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`--${name} must be a non-negative integer`);
  return parsed;
}

function required(args: ParsedArgs, name: string): string {
  const value = one(args, name)?.trim();
  if (!value) throw new Error(`--${name} is required`);
  return value;
}

function keyId(args: ParsedArgs): string {
  const id = args.positionals[0] ?? one(args, 'id');
  if (!id) throw new Error('key id is required');
  return id;
}

function status(key: ApiKeyMetadata): string {
  const now = Date.now();
  if (key.revokedAt) return 'revoked';
  if (key.expiresAt && Date.parse(key.expiresAt) <= now) return 'expired';
  return 'active';
}

function printKey(key: ApiKeyMetadata): void {
  console.log(JSON.stringify({ ...key, status: status(key) }, null, 2));
}

function printIssued(token: string, key: ApiKeyMetadata): void {
  console.log(`id: ${key.id}`);
  console.log(`label: ${key.label}`);
  console.log(`subject: ${key.subject ?? '-'}`);
  console.log(`scopes: ${key.scopes.join(',')}`);
  console.log(`servers: ${key.serverIds?.join(',') ?? '*'}`);
  console.log(`expires: ${key.expiresAt ?? 'never'}`);
  console.log(`token: ${token}`);
  console.error('IMPORTANT: the token is shown only now; the store keeps only its hash.');
}

function help(): void {
  console.log(`Managed MCP API key administration\n\nUsage:\n  pnpm auth:key -- create --label <name> [--subject <id>] [--servers example,database] [--scopes mcp] [--expires-in-days 30]\n  pnpm auth:key -- list\n  pnpm auth:key -- revoke <key-id>\n  pnpm auth:key -- rotate <key-id> [--grace-minutes 60]\n\nEnvironment:\n  MCP_AUTH_STORE   key store path (default: .data/auth-keys.json)\n\nThe CLI is intentionally local/admin-side. It is not exposed as an MCP tool.`);
}

const args = parseArgs(process.argv.slice(2));
const storePath = process.env.MCP_AUTH_STORE ?? '.data/auth-keys.json';
const store = new FileApiKeyStore(storePath);

try {
  switch (args.command) {
    case 'create': {
      const expiresInDays = integer(args, 'expires-in-days');
      const subject = one(args, 'subject')?.trim();
      const scopes = csv(args, 'scopes');
      const serverIds = csv(args, 'servers');
      const issued = await store.create({
        label: required(args, 'label'),
        ...(subject ? { subject } : {}),
        ...(scopes ? { scopes } : {}),
        ...(serverIds ? { serverIds } : {}),
        ...(expiresInDays !== undefined
          ? { expiresAt: new Date(Date.now() + expiresInDays * 86_400_000) }
          : {}),
      });
      printIssued(issued.token, issued.key);
      break;
    }
    case 'list': {
      const keys = await store.list();
      if (keys.length === 0) {
        console.log(`No API keys in ${storePath}`);
        break;
      }
      for (const key of keys) printKey(key);
      break;
    }
    case 'revoke': {
      const key = await store.revoke(keyId(args));
      console.log(`Revoked ${key.id}`);
      printKey(key);
      break;
    }
    case 'rotate': {
      const graceMinutes = integer(args, 'grace-minutes') ?? 0;
      const rotated = await store.rotate(keyId(args), { graceSeconds: graceMinutes * 60 });
      console.log(`Rotated ${rotated.previous.id} -> ${rotated.key.id}`);
      printIssued(rotated.token, rotated.key);
      if (graceMinutes > 0) {
        console.error(`Previous key remains valid until ${rotated.previous.expiresAt}.`);
      } else {
        console.error('Previous key was revoked immediately.');
      }
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      help();
      break;
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
