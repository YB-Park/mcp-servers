import { describe, expect, it } from 'vitest';
import { addTool, helloTool } from '@mcp-server/example';

const context = {
  serverId: 'example',
  identity: { claims: {} },
};

describe('example tools', () => {
  it('greets deterministically', async () => {
    await expect(helloTool.run({ name: 'MCP' }, context)).resolves.toMatchObject({
      text: 'Hello, MCP!',
      structuredContent: { greeting: 'Hello, MCP!' },
    });
  });

  it('adds exactly', async () => {
    await expect(addTool.run({ a: 20, b: 22 }, context)).resolves.toMatchObject({
      structuredContent: { result: 42 },
    });
  });
});
