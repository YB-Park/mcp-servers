import { definePrompt, defineResource, defineServer } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';
import { addTool } from './tools/add.js';
import { helloTool } from './tools/hello.js';

const aboutResource = defineResource({
  kind: 'resource',
  name: 'about',
  uri: 'example://about',
  title: 'About the example server',
  description: 'Reference information for the framework example MCP server.',
  mimeType: 'text/markdown',
  read() {
    return {
      mimeType: 'text/markdown',
      text: '# Example MCP\n\nThis server proves the framework, runtime, HTTP routing, and client integration path.',
    };
  },
});

const greetingPrompt = definePrompt({
  kind: 'prompt',
  name: 'greet-person',
  title: 'Greet a person',
  description: 'Create a request that asks the model to greet a person using the hello tool.',
  argsSchema: z.object({
    name: z.string().min(1).describe('Person to greet'),
  }),
  render({ name }) {
    return { text: `Use the hello tool to greet ${name}.` };
  },
});

export const exampleServer = defineServer({
  manifest: {
    id: 'example',
    title: 'Example MCP',
    version: '0.1.0',
    description: 'Reference MCP server used to validate framework and VS Code integration.',
    owner: 'platform',
    tags: ['example', 'reference'],
    visibility: 'internal',
  },
  instructions: [
    'This is the framework reference server.',
    'Use hello to verify connectivity and add for exact arithmetic.',
    'The server is intentionally deterministic and safe for smoke testing.',
  ].join(' '),
  tools: [helloTool, addTool],
  resources: [aboutResource],
  prompts: [greetingPrompt],
});

export { addTool, helloTool };
