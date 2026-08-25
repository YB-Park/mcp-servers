import { describe, expect, it } from 'vitest';
import { defineServer, defineTool } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';

const noInput = z.object({});

function tool(name: string) {
  return defineTool({
    kind: 'tool',
    name,
    title: name,
    description: `Test tool ${name}`,
    inputSchema: noInput,
    run: () => ({ text: 'ok' }),
  });
}

describe('mcp-kit contracts', () => {
  it('normalizes optional capability lists', () => {
    const server = defineServer({
      manifest: {
        id: 'test-server',
        title: 'Test Server',
        version: '1.0.0',
        description: 'test',
      },
    });

    expect(server.tools).toEqual([]);
    expect(server.resources).toEqual([]);
    expect(server.prompts).toEqual([]);
  });

  it('rejects invalid server ids', () => {
    expect(() => defineServer({
      manifest: {
        id: 'Bad Server',
        title: 'Bad',
        version: '1.0.0',
        description: 'bad',
      },
    })).toThrow(/Invalid server id/);
  });

  it('accepts the full MCP capability-name character set and 64-character boundary', () => {
    expect(tool('namespace/tool.v1-test_name').name).toBe('namespace/tool.v1-test_name');
    expect(tool('_'.repeat(64)).name).toHaveLength(64);
  });

  it('rejects capability names outside the MCP name contract', () => {
    expect(() => tool('')).toThrow(/Invalid tool name/);
    expect(() => tool('contains space')).toThrow(/Invalid tool name/);
    expect(() => tool('a'.repeat(65))).toThrow(/Invalid tool name/);
  });

  it('rejects duplicate capability names', () => {
    expect(() => defineServer({
      manifest: {
        id: 'duplicate-test',
        title: 'Duplicate test',
        version: '1.0.0',
        description: 'test',
      },
      tools: [tool('same'), tool('same')],
    })).toThrow(/Duplicate tool name/);
  });
});
