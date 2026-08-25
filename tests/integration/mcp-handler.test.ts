import { protocolTestModes, withMcpTestClient } from '@mcp-platform/testing';
import { exampleServer } from '@mcp-server/example';
import type { Client } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';

async function assertExampleContract(client: Client) {
  const tools = await client.listTools();
  expect(tools.tools.map(tool => tool.name)).toEqual(expect.arrayContaining(['hello', 'add']));

  const sum = await client.callTool({
    name: 'add',
    arguments: { a: 20, b: 22 },
  });
  expect(sum.structuredContent).toEqual({ result: 42 });

  const resources = await client.listResources();
  expect(resources.resources).toEqual(expect.arrayContaining([
    expect.objectContaining({ uri: 'example://about' }),
  ]));

  const about = await client.readResource({ uri: 'example://about' });
  expect(about.contents[0]).toEqual(expect.objectContaining({
    uri: 'example://about',
    mimeType: 'text/markdown',
  }));

  const prompts = await client.listPrompts();
  expect(prompts.prompts.map(prompt => prompt.name)).toContain('greet-person');

  const prompt = await client.getPrompt({
    name: 'greet-person',
    arguments: { name: 'Ada' },
  });
  expect(prompt.messages[0]?.content).toEqual(expect.objectContaining({
    type: 'text',
    text: 'Use the hello tool to greet Ada.',
  }));

  expect(client.getInstructions()).toContain('framework reference server');
}

describe('MCP handler compatibility', () => {
  for (const mode of protocolTestModes) {
    it(`serves the ${mode} protocol path from the same server definition`, async () => {
      await withMcpTestClient(exampleServer, mode, async ({ client }) => {
        expect(client.getProtocolEra()).toBe(mode);
        if (mode === 'modern') {
          expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28');
        }
        await assertExampleContract(client);
      });
    });
  }
});
