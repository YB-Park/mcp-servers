import { defineTool } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';

const inputSchema = z.object({
  name: z.string().min(1).describe('Name to greet'),
});

const outputSchema = z.object({
  greeting: z.string(),
});

export const helloTool = defineTool({
  kind: 'tool',
  name: 'hello',
  title: 'Hello',
  description: 'Return a friendly greeting for the provided name. Use this reference tool to verify MCP connectivity.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run(input) {
    const { name } = inputSchema.parse(input);
    const structuredContent = { greeting: `Hello, ${name}!` };
    return {
      text: structuredContent.greeting,
      structuredContent,
    };
  },
});
