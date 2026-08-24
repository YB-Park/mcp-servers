import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { startMcpHost } from '@mcp-platform/host';
import { exampleServer } from '@mcp-server/example';

const running = await startMcpHost({
  servers: [exampleServer],
  bindHost: '127.0.0.1',
  port: 0,
});

try {
  const health = await fetch(`${running.baseUrl}/health`);
  assert.equal(health.status, 200);
  const body = await health.json() as { status: string; servers: Array<{ id: string }> };
  assert.equal(body.status, 'ok');
  assert.equal(body.servers[0]?.id, 'example');

  const missing = await fetch(`${running.baseUrl}/mcp/missing`);
  assert.equal(missing.status, 404);

  const client = new Client(
    { name: 'http-smoke', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${running.baseUrl}/mcp/example`)),
  );

  try {
    assert.equal(client.getProtocolEra(), 'modern');
    const result = await client.callTool({ name: 'add', arguments: { a: 40, b: 2 } });
    assert.deepEqual(result.structuredContent, { result: 42 });
  } finally {
    await client.close();
  }

  console.log(`smoke ok: ${running.baseUrl}/mcp/example`);
} finally {
  await running.close();
}
