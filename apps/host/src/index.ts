import { startMcpHost } from './app.js';
import { serverDefinitions } from './registry.js';

function list(value: string | undefined): string[] | undefined {
  const items = value?.split(',').map(item => item.trim()).filter(Boolean);
  return items?.length ? items : undefined;
}

const bindHost = process.env.MCP_HOST ?? '127.0.0.1';
const port = Number(process.env.MCP_PORT ?? '3000');
const allowedHosts = list(process.env.MCP_ALLOWED_HOSTS);
const allowedOrigins = list(process.env.MCP_ALLOWED_ORIGINS);

const running = await startMcpHost({
  servers: serverDefinitions,
  bindHost,
  port,
  ...(allowedHosts ? { allowedHosts } : {}),
  ...(allowedOrigins ? { allowedOrigins } : {}),
});

console.error(`MCP host listening on ${running.baseUrl}`);
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
