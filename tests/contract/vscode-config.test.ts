import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('VS Code and Copilot MCP configuration examples', () => {
  it('keeps the VS Code workspace format authenticated without hardcoded secrets', async () => {
    const config = await readJson('examples/vscode/mcp.json');
    expect(config).toEqual({
      inputs: [
        {
          type: 'promptString',
          id: 'company-mcp-key',
          description: 'Company MCP API key',
          password: true,
        },
      ],
      servers: {
        'company-example': {
          type: 'http',
          url: 'http://mcp-server.company.local:3000/mcp/example',
          headers: {
            Authorization: 'Bearer ${input:company-mcp-key}',
          },
        },
      },
    });
    expect(JSON.stringify(config)).not.toMatch(/mcpk_[0-9a-f]{16}_/);
  });

  it('keeps the portable Agent Host/Copilot format authenticated through an environment variable', async () => {
    const config = await readJson('examples/vscode/.mcp.json');
    expect(config).toEqual({
      mcpServers: {
        'company-example': {
          type: 'http',
          url: 'http://mcp-server.company.local:3000/mcp/example',
          headers: {
            Authorization: 'Bearer ${env:MCP_API_KEY}',
          },
          tools: ['*'],
        },
      },
    });
    expect(JSON.stringify(config)).not.toMatch(/mcpk_[0-9a-f]{16}_/);
  });
});
