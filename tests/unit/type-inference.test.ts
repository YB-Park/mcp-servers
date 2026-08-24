import { definePrompt, defineTool } from '@mcp-platform/mcp-kit';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod/v4';

const inferredTool = defineTool({
  kind: 'tool',
  name: 'typed-tool',
  title: 'Typed tool',
  description: 'Compile-time fixture proving schema-driven input inference.',
  inputSchema: z.object({
    name: z.string(),
    count: z.number().int(),
  }),
  run(input) {
    expectTypeOf(input).toEqualTypeOf<{ name: string; count: number }>();
    return { text: `${input.name}:${input.count}` };
  },
});

const inferredPrompt = definePrompt({
  kind: 'prompt',
  name: 'typed-prompt',
  title: 'Typed prompt',
  description: 'Compile-time fixture proving schema-driven prompt argument inference.',
  argsSchema: z.object({
    topic: z.string(),
  }),
  render(args) {
    expectTypeOf(args).toEqualTypeOf<{ topic: string }>();
    return { text: args.topic };
  },
});

describe('mcp-kit schema inference', () => {
  it('keeps inferred definitions usable at runtime', () => {
    expect(inferredTool.name).toBe('typed-tool');
    expect(inferredPrompt.name).toBe('typed-prompt');
  });
});
