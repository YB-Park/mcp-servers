import { defineTool } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';

const inputSchema = z.object({
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
});

const outputSchema = z.object({
  result: z.number(),
});

export const addTool = defineTool({
  kind: 'tool',
  name: 'add',
  title: 'Add numbers',
  description: 'Add two numbers and return the exact numeric result.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run({ a, b }) {
    const structuredContent = { result: a + b };
    return {
      text: `${a} + ${b} = ${structuredContent.result}`,
      structuredContent,
    };
  },
});
