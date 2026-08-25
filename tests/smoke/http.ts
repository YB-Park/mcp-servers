import assert from 'node:assert/strict';
import { startMcpHost } from '@mcp-platform/host';
import { protocolTestModes, withMcpHttpTestClient } from '@mcp-platform/testing';
import { exampleServer } from '@mcp-server/example';

const running = await startMcpHost({
  servers: [exampleServer],
  bindHost: '127.0.0.1',
  port: 0,
});

try {
  const health = await fetch(`${running.baseUrl}/health`);
  assert.equal(health.status, 200);
  const body = await health.json() as { status: string };
  assert.deepEqual(body, { status: 'ok' });

  const missing = await fetch(`${running.baseUrl}/mcp/missing`);
  assert.equal(missing.status, 404);

  for (const mode of protocolTestModes) {
    await withMcpHttpTestClient(`${running.baseUrl}/mcp/example`, mode, async ({ client }) => {
      assert.equal(client.getProtocolEra(), mode);
      if (mode === 'modern') {
        assert.equal(client.getNegotiatedProtocolVersion(), '2026-07-28');
      }
      const result = await client.callTool({ name: 'add', arguments: { a: 40, b: 2 } });
      assert.deepEqual(result.structuredContent, { result: 42 });
    });
  }

  console.log(`smoke ok: legacy + modern ${running.baseUrl}/mcp/example`);
} finally {
  await running.close();
}
