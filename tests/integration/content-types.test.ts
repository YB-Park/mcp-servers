import { definePrompt, defineResource, defineServer, defineTool } from '@mcp-platform/mcp-kit';
import { protocolTestModes, withMcpTestClient } from '@mcp-platform/testing';
import { describe, expect, it } from 'vitest';
import * as z from 'zod/v4';

const TEST_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const TEST_AUDIO_BASE64 = 'UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAA=';

const richTool = defineTool({
  kind: 'tool',
  name: 'rich-content',
  title: 'Rich content',
  description: 'Return each core MCP tool content block so the runtime adapter can be contract-tested.',
  inputSchema: z.object({}),
  run() {
    return {
      content: [
        { type: 'text', text: 'rich content' },
        { type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' },
        { type: 'audio', data: TEST_AUDIO_BASE64, mimeType: 'audio/wav' },
        {
          type: 'resource',
          resource: {
            uri: 'test://embedded',
            mimeType: 'text/plain',
            text: 'embedded content',
          },
        },
        {
          type: 'resource_link',
          uri: 'test://linked',
          name: 'linked-resource',
          title: 'Linked resource',
          mimeType: 'text/plain',
        },
      ],
    };
  },
});

const binaryResource = defineResource({
  kind: 'resource',
  name: 'binary',
  uri: 'test://binary',
  title: 'Binary resource',
  mimeType: 'image/png',
  read() {
    return {
      blob: TEST_IMAGE_BASE64,
      mimeType: 'image/png',
    };
  },
});

const multiResource = defineResource({
  kind: 'resource',
  name: 'multiple',
  uri: 'test://multiple',
  title: 'Multiple resource contents',
  read() {
    return {
      contents: [
        { uri: 'test://multiple/text', text: 'text part', mimeType: 'text/plain' },
        { uri: 'test://multiple/image', blob: TEST_IMAGE_BASE64, mimeType: 'image/png' },
      ],
    };
  },
});

const richPrompt = definePrompt({
  kind: 'prompt',
  name: 'rich-prompt',
  title: 'Rich prompt',
  description: 'Return multimodal prompt messages through the framework-neutral content contract.',
  render() {
    return {
      messages: [
        { role: 'user', content: { type: 'text', text: 'inspect these inputs' } },
        {
          role: 'user',
          content: { type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' },
        },
        {
          role: 'user',
          content: {
            type: 'resource',
            resource: {
              uri: 'test://prompt-resource',
              mimeType: 'text/plain',
              text: 'prompt resource',
            },
          },
        },
      ],
    };
  },
});

const contentServer = defineServer({
  manifest: {
    id: 'content-contract',
    title: 'Content Contract',
    version: '0.1.0',
    description: 'Exercises core MCP content types through mcp-kit.',
  },
  tools: [richTool],
  resources: [binaryResource, multiResource],
  prompts: [richPrompt],
});

describe.each(protocolTestModes)('core content contract (%s)', mode => {
  it('preserves rich tool content blocks', async () => {
    await withMcpTestClient(contentServer, mode, async ({ client }) => {
      const result = await client.callTool({ name: 'rich-content', arguments: {} });
      expect(result.content).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'text', text: 'rich content' }),
        expect.objectContaining({ type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' }),
        expect.objectContaining({ type: 'audio', data: TEST_AUDIO_BASE64, mimeType: 'audio/wav' }),
        expect.objectContaining({
          type: 'resource',
          resource: expect.objectContaining({ uri: 'test://embedded', text: 'embedded content' }),
        }),
        expect.objectContaining({ type: 'resource_link', uri: 'test://linked', name: 'linked-resource' }),
      ]));
    });
  });

  it('preserves binary and multiple resource contents', async () => {
    await withMcpTestClient(contentServer, mode, async ({ client }) => {
      const binary = await client.readResource({ uri: 'test://binary' });
      expect(binary.contents[0]).toEqual(expect.objectContaining({
        uri: 'test://binary',
        blob: TEST_IMAGE_BASE64,
        mimeType: 'image/png',
      }));

      const multiple = await client.readResource({ uri: 'test://multiple' });
      expect(multiple.contents).toEqual(expect.arrayContaining([
        expect.objectContaining({ uri: 'test://multiple/text', text: 'text part' }),
        expect.objectContaining({ uri: 'test://multiple/image', blob: TEST_IMAGE_BASE64 }),
      ]));
    });
  });

  it('preserves multimodal prompt messages when arguments are omitted', async () => {
    await withMcpTestClient(contentServer, mode, async ({ client }) => {
      const prompt = await client.getPrompt({ name: 'rich-prompt' });
      expect(prompt.messages).toEqual(expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({ type: 'text', text: 'inspect these inputs' }),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({ type: 'image', mimeType: 'image/png' }),
        }),
        expect.objectContaining({
          role: 'user',
          content: expect.objectContaining({
            type: 'resource',
            resource: expect.objectContaining({ uri: 'test://prompt-resource', text: 'prompt resource' }),
          }),
        }),
      ]));
    });
  });
});
