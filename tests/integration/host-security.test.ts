import { request as httpRequest } from 'node:http';
import { createMcpHost, startMcpHost } from '@mcp-platform/host';
import { exampleServer } from '@mcp-server/example';
import { describe, expect, it } from 'vitest';

interface RawResponse {
  statusCode: number;
  body: string;
}

const rejectingVerifier = {
  async verify() {
    return undefined;
  },
};

async function requestWithHeaders(url: URL, headers: Record<string, string>): Promise<RawResponse> {
  return await new Promise<RawResponse>((resolve, reject) => {
    const request = httpRequest(url, { method: 'GET', headers }, response => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    request.once('error', reject);
    request.end();
  });
}

describe('HTTP host security defaults', () => {
  it('refuses non-loopback binding without an explicit Host allowlist', () => {
    expect(() => createMcpHost({
      servers: [exampleServer],
      bindHost: '0.0.0.0',
    })).toThrow(/allowedHosts is required/);
  });

  it('refuses unauthenticated non-loopback hosting without an explicit dangerous override', () => {
    expect(() => createMcpHost({
      servers: [exampleServer],
      bindHost: '0.0.0.0',
      allowedHosts: ['127.0.0.1'],
      auth: { mode: 'none' },
    })).toThrow(/Authentication is required on non-loopback MCP hosts/);

    expect(() => createMcpHost({
      servers: [exampleServer],
      bindHost: '0.0.0.0',
      allowedHosts: ['127.0.0.1'],
      auth: { mode: 'none', allowInsecureNoAuth: true },
    })).not.toThrow();
  });

  it('rejects an untrusted Host header on a loopback listener', async () => {
    const running = await startMcpHost({ servers: [exampleServer], port: 0 });
    try {
      const response = await requestWithHeaders(new URL(`${running.baseUrl}/health`), {
        Host: 'evil.example',
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await running.close();
    }
  });

  it('rejects an untrusted browser Origin while allowing normal non-browser requests', async () => {
    const running = await startMcpHost({ servers: [exampleServer], port: 0 });
    try {
      const normal = await fetch(`${running.baseUrl}/health`);
      expect(normal.status).toBe(200);

      const rejected = await requestWithHeaders(new URL(`${running.baseUrl}/health`), {
        Host: `127.0.0.1:${running.port}`,
        Origin: 'https://evil.example',
      });
      expect(rejected.statusCode).toBe(403);
    } finally {
      await running.close();
    }
  });

  it('rejects all browser Origins by default on non-loopback bindings while preserving non-browser health probes', async () => {
    const running = await startMcpHost({
      servers: [exampleServer],
      bindHost: '0.0.0.0',
      allowedHosts: ['127.0.0.1'],
      auth: { mode: 'api-key', verifier: rejectingVerifier },
      port: 0,
    });
    try {
      const normal = await fetch(`${running.baseUrl}/health`);
      expect(normal.status).toBe(200);

      const rejected = await requestWithHeaders(new URL(`${running.baseUrl}/health`), {
        Host: `127.0.0.1:${running.port}`,
        Origin: 'https://browser.example',
      });
      expect(rejected.statusCode).toBe(403);
    } finally {
      await running.close();
    }
  });
});
