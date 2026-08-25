import { withMcpTestClient } from '@mcp-platform/testing';
import { exampleServer } from '@mcp-server/example';
import { describe, expect, it } from 'vitest';

// VS Code can virtualize larger catalogs, but a single reference MCP should remain
// comfortably within the directly enabled tool budget for clear selection UX.
const VSCODE_DIRECT_TOOL_BUDGET = 128;

describe('VS Code-facing MCP surface', () => {
  it('publishes discovery metadata that is usable by the VS Code tool picker and agent', async () => {
    await withMcpTestClient(exampleServer, 'modern', async ({ client }) => {
      const { tools } = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThanOrEqual(VSCODE_DIRECT_TOOL_BUDGET);

      for (const tool of tools) {
        expect(tool.name.trim()).not.toBe('');
        expect(tool.title?.trim()).not.toBe('');
        expect(tool.description?.trim()).not.toBe('');
        expect(tool.inputSchema).toEqual(expect.objectContaining({ type: 'object' }));
        expect(tool.annotations).toBeDefined();
      }

      const { resources } = await client.listResources();
      for (const resource of resources) {
        expect(resource.name.trim()).not.toBe('');
        expect(resource.title?.trim()).not.toBe('');
        expect(() => new URL(resource.uri)).not.toThrow();
      }

      const { prompts } = await client.listPrompts();
      for (const prompt of prompts) {
        expect(prompt.name.trim()).not.toBe('');
        expect(prompt.title?.trim()).not.toBe('');
        expect(prompt.description?.trim()).not.toBe('');
      }

      expect(client.getInstructions()?.trim()).not.toBe('');
    });
  });
});
