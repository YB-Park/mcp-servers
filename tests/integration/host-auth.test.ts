import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defineServer, defineTool } from '@mcp-platform/mcp-kit';
import { startMcpHost } from '@mcp-platform/host';
import { FileApiKeyStore } from '@mcp-platform/runtime';
import { protocolTestModes, withMcpHttpTestClient } from '@mcp-platform/testing';
import { exampleServer } from '@mcp-server/example';
import { afterEach, describe, expect, it } from 'vitest';
import * as z from 'zod/v4';

const directories: string[] = [];

const whoAmITool = defineTool({
  kind: 'tool',
  name: 'whoami',
  title: 'Who am I',
  description: 'Return sanitized identity metadata for authentication integration testing.',
  inputSchema: z.object({}),
  outputSchema: z.object({
    subject: z.string().nullable(),
    actor: z.string().nullable(),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run(_input, context) {
    const structuredContent = {
      subject: context.identity.subject ?? null,
      actor: context.identity.actor ?? null,
    };
    return { text: JSON.stringify(structuredContent), structuredContent };
  },
});

const authFixtureServer = defineServer({
  manifest: {
    id: 'auth-fixture',
    title: 'Auth fixture',
    version: '1.0.0',
    description: 'Authentication integration fixture.',
  },
  tools: [whoAmITool],
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'mcp-host-auth-'));
  directories.push(directory);
  const store = new FileApiKeyStore(join(directory, 'keys.json'));
  const running = await startMcpHost({
    servers: [exampleServer, authFixtureServer],
    port: 0,
    auth: { mode: 'api-key', verifier: store },
  });
  return { store, running };
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe('managed API key host authentication', () => {
  it('keeps health minimal/public and authenticates before revealing MCP server existence', async () => {
    const { store, running } = await fixture();
    try {
      const health = await fetch(`${running.baseUrl}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ status: 'ok' });

      const missing = await fetch(`${running.baseUrl}/mcp/example`, { method: 'POST' });
      expect(missing.status).toBe(401);
      expect(missing.headers.get('www-authenticate')).toContain('Bearer');

      const missingUnknown = await fetch(`${running.baseUrl}/mcp/not-registered`, { method: 'POST' });
      expect(missingUnknown.status).toBe(401);

      const invalid = await fetch(`${running.baseUrl}/mcp/example`, {
        method: 'POST',
        headers: { Authorization: 'Bearer invalid' },
      });
      expect(invalid.status).toBe(401);

      const issued = await store.create({ label: 'Authenticated discovery test' });
      const authenticatedUnknown = await fetch(`${running.baseUrl}/mcp/not-registered`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${issued.token}` },
      });
      expect(authenticatedUnknown.status).toBe(404);
    } finally {
      await running.close();
    }
  });

  it.each(protocolTestModes)('accepts a valid key with official MCP client (%s)', async mode => {
    const { store, running } = await fixture();
    try {
      const issued = await store.create({ label: `${mode} test`, subject: 'test-user' });
      await withMcpHttpTestClient(
        `${running.baseUrl}/mcp/example`,
        mode,
        async ({ client }) => {
          const tools = await client.listTools();
          expect(tools.tools.map(tool => tool.name)).toContain('hello');
          const result = await client.callTool({ name: 'hello', arguments: { name: 'auth' } });
          expect(result.content).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'text', text: expect.stringContaining('auth') }),
          ]));
        },
        { bearerToken: issued.token },
      );
    } finally {
      await running.close();
    }
  });

  it.each(protocolTestModes)('propagates only sanitized API-key identity metadata (%s)', async mode => {
    const { store, running } = await fixture();
    try {
      const issued = await store.create({ label: 'Identity test', subject: 'employee-123' });
      await withMcpHttpTestClient(
        `${running.baseUrl}/mcp/auth-fixture`,
        mode,
        async ({ client }) => {
          const result = await client.callTool({ name: 'whoami', arguments: {} });
          expect(result.structuredContent).toEqual({
            subject: 'employee-123',
            actor: `api-key:${issued.key.id}`,
          });
          expect(JSON.stringify(result)).not.toContain(issued.token);
        },
        { bearerToken: issued.token },
      );
    } finally {
      await running.close();
    }
  });

  it('returns 403 when a valid key is not allowed to access the requested MCP server', async () => {
    const { store, running } = await fixture();
    try {
      const issued = await store.create({ label: 'Database only', serverIds: ['database'] });
      const response = await fetch(`${running.baseUrl}/mcp/example`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${issued.token}` },
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: 'forbidden', reason: 'api_key_not_allowed_for_server' });
    } finally {
      await running.close();
    }
  });

  it('returns 403 when a key lacks the mcp scope', async () => {
    const { store, running } = await fixture();
    try {
      const issued = await store.create({ label: 'Wrong scope', scopes: ['database:read'] });
      const response = await fetch(`${running.baseUrl}/mcp/example`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${issued.token}` },
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: 'forbidden', reason: 'api_key_missing_mcp_scope' });
    } finally {
      await running.close();
    }
  });
});
