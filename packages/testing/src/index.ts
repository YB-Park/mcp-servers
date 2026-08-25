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

export interface McpHttpTestClientOptions {
  bearerToken?: string;
}

function createClient(mode: ProtocolTestMode): Client {
  return new Client(
    { name: `mcp-platform-test-${mode}`, version: '1.0.0' },
    mode === 'modern' ? { versionNegotiation: { mode: 'auto' } } : undefined,
  );
}

export async function connectMcpTestClient(
  definition: ServerDefinition,
  mode: ProtocolTestMode = 'modern',
): Promise<McpTestSession> {
  const handler = createServerHandler(definition);
  const transport = new StreamableHTTPClientTransport(new URL('http://mcp-test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = createClient(mode);

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

export async function connectMcpHttpTestClient(
  url: URL | string,
  mode: ProtocolTestMode = 'modern',
  options: McpHttpTestClientOptions = {},
): Promise<McpTestSession> {
  const client = createClient(mode);
  const transport = new StreamableHTTPClientTransport(
    typeof url === 'string' ? new URL(url) : url,
    options.bearerToken
      ? { authProvider: { token: async () => options.bearerToken } }
      : undefined,
  );

  await client.connect(transport);
  let closed = false;
  return {
    client,
    mode,
    async close() {
      if (closed) return;
      closed = true;
      await client.close();
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

export async function withMcpHttpTestClient<T>(
  url: URL | string,
  mode: ProtocolTestMode,
  run: (session: McpTestSession) => Promise<T> | T,
  options: McpHttpTestClientOptions = {},
): Promise<T> {
  const session = await connectMcpHttpTestClient(url, mode, options);
  try {
    return await run(session);
  } finally {
    await session.close();
  }
}
