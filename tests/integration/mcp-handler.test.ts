import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createServerHandler } from '@mcp-platform/runtime';
import { exampleServer } from '@mcp-server/example';
import { afterEach, describe, expect, it } from 'vitest';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length) {
    await cleanups.pop()?.();
  }
});

async function connect(mode: 'legacy' | 'modern') {
  const handler = createServerHandler(exampleServer);
  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });
  const client = new Client(
    { name: `integration-${mode}`, version: '1.0.0' },
    mode === 'modern' ? { versionNegotiation: { mode: 'auto' } } : undefined,
  );

  await client.connect(transport);
  cleanups.push(async () => {
    await client.close();
    await handler.close();
  });
  return client;
}

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
  it('serves the legacy 2025-era connection used by default clients', async () => {
    const client = await connect('legacy');
    expect(client.getProtocolEra()).toBe('legacy');
    await assertExampleContract(client);
  });

  it('serves modern 2026-07-28 negotiation from the same endpoint', async () => {
    const client = await connect('modern');
    expect(client.getProtocolEra()).toBe('modern');
    expect(client.getNegotiatedProtocolVersion()).toBe('2026-07-28');
    await assertExampleContract(client);
  });
});
