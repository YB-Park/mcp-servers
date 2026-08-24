import { createServer, type IncomingMessage, type Server as HttpServer } from 'node:http';
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

type NormalizedIncomingRequest = IncomingMessage & { method: string; url: string };

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function normalizeIncomingRequest(req: IncomingMessage): NormalizedIncomingRequest | undefined {
  // Node's IncomingMessage types allow method/url to be absent, while a real
  // inbound HTTP server request should carry both and MCP's node adapter
  // requires them. Reject malformed input instead of weakening strict types.
  if (!req.method || !req.url) {
    return undefined;
  }
  return req as NormalizedIncomingRequest;
}

export function createMcpHost(options: HostOptions): HttpServer {
  const bindHost = options.bindHost ?? '127.0.0.1';
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

  // Build MCP handlers only after host security configuration has been accepted.
  // This avoids constructing protocol resources for a host configuration that
  // will be rejected before the HTTP server is returned.
  const registry = new ServerRegistry(options.servers);
  const nodeHandlers = new Map(
    registry.list().map(definition => [
      definition.manifest.id,
      toNodeHandler(createServerHandler(definition)),
    ] as const),
  );

  return createServer((req, res) => {
    const normalizedRequest = normalizeIncomingRequest(req);
    if (!normalizedRequest) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'invalid_http_request' }));
      return;
    }

    if (!validateHost(normalizedRequest, res)) return;
    if (validateOrigin && !validateOrigin(normalizedRequest, res)) return;

    const pathname = new URL(normalizedRequest.url, 'http://mcp.local').pathname;

    if (pathname === '/health' && normalizedRequest.method === 'GET') {
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

    void handler(normalizedRequest, res);
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
