import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileApiKeyStore } from '@mcp-platform/auth';
import { afterEach, describe, expect, it } from 'vitest';

const directories: string[] = [];

async function store() {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-auth-'));
  directories.push(directory);
  const path = join(directory, 'keys.json');
  return { path, store: new FileApiKeyStore(path) };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('FileApiKeyStore', () => {
  it('issues a high-entropy token but persists only its hash', async () => {
    const fixture = await store();
    const issued = await fixture.store.create({
      label: 'Park laptop',
      subject: 'park',
      serverIds: ['example'],
    });

    expect(issued.token).toMatch(/^mcpk_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/);
    expect(await fixture.store.verify(issued.token)).toMatchObject({
      id: issued.key.id,
      label: 'Park laptop',
      subject: 'park',
      scopes: ['mcp'],
      serverIds: ['example'],
    });
    expect(await fixture.store.verify(`${issued.token}x`)).toBeUndefined();

    const persisted = await readFile(fixture.path, 'utf8');
    expect(persisted).not.toContain(issued.token);
    expect(persisted).toContain('tokenHash');
  });

  it('rejects expired and revoked keys', async () => {
    const fixture = await store();
    const expired = await fixture.store.create({
      label: 'Expired',
      expiresAt: new Date(Date.now() - 1_000),
    });
    expect(await fixture.store.verify(expired.token)).toBeUndefined();

    const active = await fixture.store.create({ label: 'Active' });
    expect(await fixture.store.verify(active.token)).toBeDefined();
    await fixture.store.revoke(active.key.id);
    expect(await fixture.store.verify(active.token)).toBeUndefined();
  });

  it('rotates a key and can keep the previous key alive for a grace window', async () => {
    const fixture = await store();
    const original = await fixture.store.create({
      label: 'VS Code workstation',
      subject: 'park',
      scopes: ['mcp', 'database:read'],
      serverIds: ['example', 'database'],
    });

    const rotated = await fixture.store.rotate(original.key.id, { graceSeconds: 60 });
    expect(rotated.key.id).not.toBe(original.key.id);
    expect(rotated.previous.replacedBy).toBe(rotated.key.id);
    expect(rotated.previous.expiresAt).toBeDefined();
    expect(await fixture.store.verify(original.token)).toBeDefined();
    expect(await fixture.store.verify(rotated.token)).toMatchObject({
      subject: 'park',
      scopes: ['mcp', 'database:read'],
      serverIds: ['example', 'database'],
    });
  });

  it('immediately revokes the previous key on zero-grace rotation', async () => {
    const fixture = await store();
    const original = await fixture.store.create({ label: 'Old key' });
    const rotated = await fixture.store.rotate(original.key.id);

    expect(rotated.previous.revokedAt).toBeDefined();
    expect(await fixture.store.verify(original.token)).toBeUndefined();
    expect(await fixture.store.verify(rotated.token)).toBeDefined();
  });
});
