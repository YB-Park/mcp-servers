import { createServer, type IncomingMessage, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { apiKeyAllowsServer, type ApiKeyMetadata } from '@mcp-platform/auth';
import type { ServerDefinition } from '@mcp-platform/mcp-kit';
import { createServerHandler, ServerRegistry } from '@mcp-platform/runtime';
import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';

export type HostAuthMode = 'none' | 'api-key';

export interface ApiKeyVerifier {
  verify(token: string): Promise<ApiKeyMetadata | undefined>;
}

export interface HostAuthOptions {
  mode?: HostAuthMode;
  verifier?: ApiKeyVerifier;
}

export interface HostOptions {
  servers: readonly ServerDefinition[];
  bindHost?: string;
  allowedHosts?: readonly string[];
  allowedOrigins?: readonly string[];
  auth?: HostAuthOptions;
}

export interface RunningHost {
  server: HttpServer;
  host: string;
  port: number;
  baseUrl: string;
  close(): Promise<void>;
}

type ForwardedAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  extra?: Record<string, unknown>;
};

type NormalizedIncomingRequest = IncomingMessage & {
  method: string;
  url: string;
  auth?: ForwardedAuthInfo;
};

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function normalizeIncomingRequest(req: IncomingMessage): NormalizedIncomingRequest | undefined {
  if (!req.method || !req.url) {
    return undefined;
  }
  return req as NormalizedIncomingRequest;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? undefined : value;
}

function bearerToken(req: NormalizedIncomingRequest): string | undefined {
  const authorization = headerValue(req.headers.authorization);
  if (!authorization) return undefined;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization.trim());
  return match?.[1];
}

function unauthorized(res: import('node:http').ServerResponse, reason: string): void {
  res.statusCode = 401;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('www-authenticate', 'Bearer realm="mcp-platform"');
  res.end(JSON.stringify({ error: 'unauthorized', reason }));
}

function forbidden(res: import('node:http').ServerResponse, reason: string): void {
  res.statusCode = 403;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'forbidden', reason }));
}

function forwardedAuth(token: string, key: ApiKeyMetadata): ForwardedAuthInfo {
  const subject = key.subject ?? `api-key:${key.id}`;
  const expiresAt = key.expiresAt ? Math.floor(Date.parse(key.expiresAt) / 1000) : undefined;
  return {
    token,
    clientId: `api-key:${key.id}`,
    scopes: [...key.scopes],
    ...(Number.isFinite(expiresAt) ? { expiresAt } : {}),
    extra: { sub: subject },
  };
}

export function createMcpHost(options: HostOptions): HttpServer {
  const bindHost = options.bindHost ?? '127.0.0.1';
  const loopback = isLoopback(bindHost);
  const authMode = options.auth?.mode ?? (loopback ? 'none' : 'api-key');
  const authVerifier = options.auth?.verifier;

  if (authMode === 'api-key' && !authVerifier) {
    throw new Error('API key verifier is required when MCP authentication mode is api-key');
  }

  const validateHost = options.allowedHosts?.length
    ? hostHeaderValidation([...options.allowedHosts])
    : loopback
      ? localhostHostValidation()
      : undefined;

  const validateOrigin = options.allowedOrigins?.length
    ? originValidation([...options.allowedOrigins])
    : loopback
      ? localhostOriginValidation()
      : originValidation([]);

  if (!validateHost) {
    throw new Error('allowedHosts is required when binding MCP host to a non-loopback interface');
  }

  const registry = new ServerRegistry(options.servers);
  const nodeHandlers = new Map(
    registry.list().map(definition => [
      definition.manifest.id,
      toNodeHandler(createServerHandler(definition)),
    ] as const),
  );

  async function handleRequest(req: IncomingMessage, res: import('node:http').ServerResponse): Promise<void> {
    const normalizedRequest = normalizeIncomingRequest(req);
    if (!normalizedRequest) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'invalid_http_request' }));
      return;
    }

    if (!validateHost(normalizedRequest, res)) return;
    if (!validateOrigin(normalizedRequest, res)) return;

    const pathname = new URL(normalizedRequest.url, 'http://mcp.local').pathname;

    // Liveness stays unauthenticated so container/orchestrator probes do not need a credential.
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
    if (!handler || !serverId) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'unknown_mcp_server', serverId }));
      return;
    }

    if (authMode === 'api-key') {
      const token = bearerToken(normalizedRequest);
      if (!token) {
        unauthorized(res, 'missing_or_malformed_bearer_token');
        return;
      }
      const key = await authVerifier!.verify(token);
      if (!key) {
        unauthorized(res, 'invalid_or_expired_api_key');
        return;
      }
      if (!key.scopes.includes('mcp')) {
        forbidden(res, 'api_key_missing_mcp_scope');
        return;
      }
      if (!apiKeyAllowsServer(key, serverId)) {
        forbidden(res, 'api_key_not_allowed_for_server');
        return;
      }
      normalizedRequest.auth = forwardedAuth(token, key);
    }

    await handler(normalizedRequest, res);
  }

  return createServer((req, res) => {
    void handleRequest(req, res).catch(error => {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
        return;
      }
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'internal_server_error' }));
    });
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
