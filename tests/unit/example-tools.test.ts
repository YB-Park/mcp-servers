import { describe, expect, it } from 'vitest';
import { addTool, helloTool } from '@mcp-server/example';

const context = {
  serverId: 'example',
  identity: { claims: {} },
};

describe('example tools', () => {
  it('greets deterministically', async () => {
    const result = await helloTool.run({ name: 'MCP' }, context);
    expect(result).toMatchObject({
      text: 'Hello, MCP!',
      structuredContent: { greeting: 'Hello, MCP!' },
    });
  });

  it('adds exactly', async () => {
    const result = await addTool.run({ a: 20, b: 22 }, context);
    expect(result).toMatchObject({
      structuredContent: { result: 42 },
    });
  });
});
