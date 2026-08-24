import type { ServerDefinition } from '@mcp-platform/mcp-kit';
import { createServerHandler } from '@mcp-platform/runtime';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

export const protocolTestModes = ['legacy', 'modern'] as const;
export type ProtocolTestMode = (typeof protocolTestModes)[number];

export interface McpTestSession {
  client: Client;
  mode: ProtocolTestMode;
  close(): Promise<void>;
}

export async function connectMcpTestClient(
  definition: ServerDefinition,
  mode: ProtocolTestMode = 'modern',
): Promise<McpTestSession> {
  const handler = createServerHandler(definition);
  const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: `mcp-platform-test-${mode}`, version: '1.0.0' },
    mode === 'modern' ? { versionNegotiation: { mode: 'auto' } } : undefined,
  );

  try {
    await client.connect(transport);
  } catch (error) {
    await handler.close();
    throw error;
  }

  let closed = false;
  return {
    client,
    mode,
    async close() {
      if (closed) return;
      closed = true;
      try {
        await client.close();
      } finally {
        await handler.close();
      }
    },
  };
}

export async function withMcpTestClient<T>(
  definition: ServerDefinition,
  mode: ProtocolTestMode,
  run: (session: McpTestSession) => Promise<T> | T,
): Promise<T> {
  const session = await connectMcpTestClient(definition, mode);
  try {
    return await run(session);
  } finally {
    await session.close();
  }
}
