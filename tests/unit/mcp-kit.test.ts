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
