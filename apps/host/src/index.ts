import { FileApiKeyStore } from '@mcp-platform/runtime';
import { startMcpHost, type HostAuthMode } from './app.js';
import { serverDefinitions } from './registry.js';

function list(value: string | undefined): string[] | undefined {
  const items = value?.split(',').map(item => item.trim()).filter(Boolean);
  return items?.length ? items : undefined;
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function authMode(value: string | undefined, bindHost: string): HostAuthMode {
  if (!value) return isLoopback(bindHost) ? 'none' : 'api-key';
  if (value === 'none' || value === 'api-key') return value;
  throw new Error(`Unsupported MCP_AUTH_MODE: ${value}; expected none or api-key`);
}

const bindHost = process.env.MCP_HOST ?? '127.0.0.1';
const port = Number(process.env.MCP_PORT ?? '3000');
const allowedHosts = list(process.env.MCP_ALLOWED_HOSTS);
const allowedOrigins = list(process.env.MCP_ALLOWED_ORIGINS);
const mode = authMode(process.env.MCP_AUTH_MODE, bindHost);
const authStorePath = process.env.MCP_AUTH_STORE ?? '.data/auth-keys.json';
const allowInsecureNoAuth = process.env.MCP_ALLOW_INSECURE_NO_AUTH === 'true';
const keyStore = mode === 'api-key' ? new FileApiKeyStore(authStorePath) : undefined;

const running = await startMcpHost({
  servers: serverDefinitions,
  bindHost,
  port,
  ...(allowedHosts ? { allowedHosts } : {}),
  ...(allowedOrigins ? { allowedOrigins } : {}),
  auth: {
    mode,
    ...(keyStore ? { verifier: keyStore } : {}),
    ...(allowInsecureNoAuth ? { allowInsecureNoAuth: true } : {}),
  },
});

console.error(`MCP host listening on ${running.baseUrl}`);
console.error(`Authentication: ${mode}${keyStore ? ` (${authStorePath})` : ''}`);
if (mode === 'none' && !isLoopback(bindHost)) {
  console.error('WARNING: non-loopback MCP host is running without authentication by explicit override.');
}
for (const definition of serverDefinitions) {
  console.error(`- ${definition.manifest.id}: ${running.baseUrl}/mcp/${definition.manifest.id}`);
}

async function shutdown(signal: string): Promise<void> {
  console.error(`Received ${signal}; shutting down MCP host`);
  await running.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

export { createMcpHost, startMcpHost } from './app.js';
export type { HostAuthMode, HostAuthOptions } from './app.js';
