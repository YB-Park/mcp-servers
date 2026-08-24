import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ServerDefinition } from '@mcp-platform/mcp-kit';
import { createServerHandler, ServerRegistry } from '@mcp-platform/runtime';
import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';

export interface HostOptions {
  servers: readonly ServerDefinition[];
  bindHost?: string;
  allowedHosts?: readonly string[];
  allowedOrigins?: readonly string[];
}

export interface RunningHost {
  server: HttpServer;
  host: string;
  port: number;
  baseUrl: string;
  close(): Promise<void>;
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

export function createMcpHost(options: HostOptions): HttpServer {
  const bindHost = options.bindHost ?? '127.0.0.1';
  const registry = new ServerRegistry(options.servers);
  const nodeHandlers = new Map(
    registry.list().map(definition => [
      definition.manifest.id,
      toNodeHandler(createServerHandler(definition)),
    ] as const),
  );

  const validateHost = options.allowedHosts?.length
    ? hostHeaderValidation([...options.allowedHosts])
    : isLoopback(bindHost)
      ? localhostHostValidation()
      : undefined;

  const validateOrigin = options.allowedOrigins?.length
    ? originValidation([...options.allowedOrigins])
    : isLoopback(bindHost)
      ? localhostOriginValidation()
      : undefined;

  if (!validateHost) {
    throw new Error('allowedHosts is required when binding MCP host to a non-loopback interface');
  }

  return createServer((req, res) => {
    if (!validateHost(req, res)) return;
    if (validateOrigin && !validateOrigin(req, res)) return;

    const pathname = new URL(req.url ?? '/', 'http://mcp.local').pathname;

    if (pathname === '/health' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        status: 'ok',
        servers: registry.list().map(definition => ({
          id: definition.manifest.id,
          version: definition.manifest.version,
          endpoint: `/mcp/${definition.manifest.id}`,
        })),
      }));
      return;
    }

    const match = /^\/mcp\/([a-z][a-z0-9-]*)$/.exec(pathname);
    if (!match) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    const serverId = match[1];
    const handler = serverId ? nodeHandlers.get(serverId) : undefined;
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'unknown_mcp_server', serverId }));
      return;
    }

    void handler(req, res);
  });
}

export async function startMcpHost(
  options: HostOptions & { port?: number },
): Promise<RunningHost> {
  const host = options.bindHost ?? '127.0.0.1';
  const server = createMcpHost(options);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 3000, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const displayHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;

  return {
    server,
    host,
    port: address.port,
    baseUrl: `http://${displayHost}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}
