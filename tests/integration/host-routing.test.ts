import { defineServer, defineTool } from '@mcp-platform/mcp-kit';
import { startMcpHost } from '@mcp-platform/host';
import { protocolTestModes, withMcpHttpTestClient } from '@mcp-platform/testing';
import { exampleServer } from '@mcp-server/example';
import { describe, expect, it } from 'vitest';
import * as z from 'zod/v4';

const isolationTool = defineTool({
  kind: 'tool',
  name: 'isolation-only',
  title: 'Isolation-only tool',
  description: 'Exists only on the second test server to prove host route isolation.',
  inputSchema: z.object({}),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run() {
    return { text: 'isolated' };
  },
});

const isolationServer = defineServer({
  manifest: {
    id: 'isolation',
    title: 'Isolation fixture',
    version: '1.0.0',
    description: 'Second MCP module used only to prove central-host isolation.',
  },
  tools: [isolationTool],
});

describe('central host routing and isolation', () => {
  for (const mode of protocolTestModes) {
    it(`keeps server capabilities isolated over real HTTP in ${mode} mode`, async () => {
      const running = await startMcpHost({
        servers: [exampleServer, isolationServer],
        port: 0,
      });

      try {
        const health = await fetch(`${running.baseUrl}/health`);
        expect(health.status).toBe(200);
        const body = await health.json() as {
          servers: Array<{ id: string; endpoint: string }>;
        };
        expect(body.servers).toEqual(expect.arrayContaining([
          expect.objectContaining({ id: 'example', endpoint: '/mcp/example' }),
          expect.objectContaining({ id: 'isolation', endpoint: '/mcp/isolation' }),
        ]));

        await withMcpHttpTestClient(`${running.baseUrl}/mcp/example`, mode, async ({ client }) => {
          const names = (await client.listTools()).tools.map(tool => tool.name);
          expect(names).toEqual(expect.arrayContaining(['hello', 'add']));
          expect(names).not.toContain('isolation-only');
        });

        await withMcpHttpTestClient(`${running.baseUrl}/mcp/isolation`, mode, async ({ client }) => {
          const names = (await client.listTools()).tools.map(tool => tool.name);
          expect(names).toEqual(['isolation-only']);
          expect(names).not.toContain('hello');
          expect(names).not.toContain('add');
        });
      } finally {
        await running.close();
      }
    });
  }
});
