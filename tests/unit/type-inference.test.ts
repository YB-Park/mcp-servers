import { definePrompt, defineTool, type ExecutionContext } from '@mcp-platform/mcp-kit';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod/v4';

const inferredTool = defineTool({
  kind: 'tool',
  name: 'typed-tool',
  title: 'Typed tool',
  description: 'Compile-time fixture proving schema-driven input and output inference.',
  inputSchema: z.object({
    name: z.string(),
    count: z.number().int(),
  }),
  outputSchema: z.array(z.string()),
  run(input) {
    expectTypeOf(input).toEqualTypeOf<{ name: string; count: number }>();
    const structuredContent = [input.name.repeat(input.count)];
    expectTypeOf(structuredContent).toEqualTypeOf<string[]>();
    return { text: structuredContent[0] ?? '', structuredContent };
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
  render(args, context) {
    expectTypeOf(args).toEqualTypeOf<{ topic: string }>();
    expectTypeOf(context).toEqualTypeOf<ExecutionContext>();
    return { text: args.topic };
  },
});

const noArgsPrompt = definePrompt({
  kind: 'prompt',
  name: 'typed-no-args-prompt',
  title: 'Typed no-args prompt',
  description: 'Compile-time fixture proving no-argument prompts receive only execution context.',
  render(context) {
    expectTypeOf(context).toEqualTypeOf<ExecutionContext>();
    return { text: context.serverId };
  },
});

describe('mcp-kit schema inference', () => {
  it('keeps inferred definitions usable at runtime', () => {
    expect(inferredTool.name).toBe('typed-tool');
    expect(inferredPrompt.name).toBe('typed-prompt');
    expect(noArgsPrompt.name).toBe('typed-no-args-prompt');
    expect(noArgsPrompt.argsSchema).toBeUndefined();
  });
});
