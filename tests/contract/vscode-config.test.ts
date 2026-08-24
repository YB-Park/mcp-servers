import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('VS Code and Copilot MCP configuration examples', () => {
  it('keeps the VS Code workspace format valid', async () => {
    const config = await readJson('examples/vscode/mcp.json');
    expect(config).toEqual({
      servers: {
        'company-example': {
          type: 'http',
          url: 'http://127.0.0.1:3000/mcp/example',
        },
      },
    });
  });

  it('keeps the portable Agent Host/Copilot format valid', async () => {
    const config = await readJson('examples/vscode/.mcp.json');
    expect(config).toEqual({
      mcpServers: {
        'company-example': {
          type: 'http',
          url: 'http://127.0.0.1:3000/mcp/example',
          tools: ['*'],
        },
      },
    });
  });
});
