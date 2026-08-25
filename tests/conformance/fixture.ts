import { definePrompt, defineResource, defineServer, defineTool } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';

export const TEST_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

export const TEST_AUDIO_BASE64 =
  'UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAA=';

const simpleTextTool = defineTool({
  kind: 'tool',
  name: 'test_simple_text',
  title: 'Simple text',
  description: 'Conformance fixture for a simple text tool result.',
  inputSchema: z.object({}),
  run() {
    return { text: 'This is a simple text response for testing.' };
  },
});

const imageTool = defineTool({
  kind: 'tool',
  name: 'test_image_content',
  title: 'Image content',
  description: 'Conformance fixture for image content.',
  inputSchema: z.object({}),
  run() {
    return {
      content: [{ type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' }],
    };
  },
});

const audioTool = defineTool({
  kind: 'tool',
  name: 'test_audio_content',
  title: 'Audio content',
  description: 'Conformance fixture for audio content.',
  inputSchema: z.object({}),
  run() {
    return {
      content: [{ type: 'audio', data: TEST_AUDIO_BASE64, mimeType: 'audio/wav' }],
    };
  },
});

const embeddedResourceTool = defineTool({
  kind: 'tool',
  name: 'test_embedded_resource',
  title: 'Embedded resource',
  description: 'Conformance fixture for embedded resource content.',
  inputSchema: z.object({}),
  run() {
    return {
      content: [
        {
          type: 'resource',
          resource: {
            uri: 'test://embedded-resource',
            mimeType: 'text/plain',
            text: 'This is an embedded resource content.',
          },
        },
      ],
    };
  },
});

const mixedContentTool = defineTool({
  kind: 'tool',
  name: 'test_multiple_content_types',
  title: 'Multiple content types',
  description: 'Conformance fixture for mixed text, image, and embedded resource content.',
  inputSchema: z.object({}),
  run() {
    return {
      content: [
        { type: 'text', text: 'Multiple content types test:' },
        { type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' },
        {
          type: 'resource',
          resource: {
            uri: 'test://mixed-content-resource',
            mimeType: 'application/json',
            text: JSON.stringify({ test: 'data', value: 123 }),
          },
        },
      ],
    };
  },
});

const errorTool = defineTool({
  kind: 'tool',
  name: 'test_error_handling',
  title: 'Intentional error',
  description: 'Conformance fixture that intentionally throws a tool execution error.',
  inputSchema: z.object({}),
  run() {
    throw new Error('This tool intentionally returns an error for testing');
  },
});

const staticTextResource = defineResource({
  kind: 'resource',
  name: 'static-text',
  uri: 'test://static-text',
  title: 'Static Text Resource',
  description: 'A static text resource for conformance testing.',
  mimeType: 'text/plain',
  read() {
    return {
      text: 'This is the content of the static text resource.',
      mimeType: 'text/plain',
    };
  },
});

const staticBinaryResource = defineResource({
  kind: 'resource',
  name: 'static-binary',
  uri: 'test://static-binary',
  title: 'Static Binary Resource',
  description: 'A static binary PNG resource for conformance testing.',
  mimeType: 'image/png',
  read() {
    return {
      blob: TEST_IMAGE_BASE64,
      mimeType: 'image/png',
    };
  },
});

const simplePrompt = definePrompt({
  kind: 'prompt',
  name: 'test_simple_prompt',
  title: 'Simple Test Prompt',
  description: 'A simple prompt without arguments.',
  argsSchema: z.object({}),
  render() {
    return { text: 'This is a simple prompt for testing.' };
  },
});

const argumentsPrompt = definePrompt({
  kind: 'prompt',
  name: 'test_prompt_with_arguments',
  title: 'Prompt With Arguments',
  description: 'A prompt with two required arguments.',
  argsSchema: z.object({
    arg1: z.string(),
    arg2: z.string(),
  }),
  render({ arg1, arg2 }) {
    return { text: `Prompt with arguments: arg1='${arg1}', arg2='${arg2}'` };
  },
});

const embeddedResourcePrompt = definePrompt({
  kind: 'prompt',
  name: 'test_prompt_with_embedded_resource',
  title: 'Prompt With Embedded Resource',
  description: 'A prompt containing an embedded text resource.',
  argsSchema: z.object({
    resourceUri: z.string(),
  }),
  render({ resourceUri }) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'resource',
            resource: {
              uri: resourceUri,
              mimeType: 'text/plain',
              text: 'Embedded resource content for testing.',
            },
          },
        },
        {
          role: 'user',
          content: { type: 'text', text: 'Please process the embedded resource above.' },
        },
      ],
    };
  },
});

const imagePrompt = definePrompt({
  kind: 'prompt',
  name: 'test_prompt_with_image',
  title: 'Prompt With Image',
  description: 'A prompt containing an image followed by text.',
  argsSchema: z.object({}),
  render() {
    return {
      messages: [
        {
          role: 'user',
          content: { type: 'image', data: TEST_IMAGE_BASE64, mimeType: 'image/png' },
        },
        {
          role: 'user',
          content: { type: 'text', text: 'Please analyze the image above.' },
        },
      ],
    };
  },
});

export const conformanceFixtureServer = defineServer({
  manifest: {
    id: 'conformance',
    title: 'MCP Conformance Fixture',
    version: '0.1.0',
    description: 'Test-only fixture for the MCP core conformance gate.',
    owner: 'platform',
    tags: ['conformance', 'test-only'],
    visibility: 'private',
  },
  tools: [
    simpleTextTool,
    imageTool,
    audioTool,
    embeddedResourceTool,
    mixedContentTool,
    errorTool,
  ],
  resources: [staticTextResource, staticBinaryResource],
  prompts: [simplePrompt, argumentsPrompt, embeddedResourcePrompt, imagePrompt],
});
