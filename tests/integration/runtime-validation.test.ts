import { defineServer, defineTool } from '@mcp-platform/mcp-kit';
import { protocolTestModes, withMcpTestClient } from '@mcp-platform/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import * as z from 'zod/v4';

let inputHandlerRuns = 0;
let outputHandlerRuns = 0;

const inputValidatedTool = defineTool({
  kind: 'tool',
  name: 'input-validated',
  title: 'Input validated tool',
  description: 'Used by the runtime contract suite to verify input validation.',
  inputSchema: z.object({ value: z.number().int() }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run({ value }) {
    inputHandlerRuns += 1;
    return { text: `value=${value}` };
  },
});

const outputValidatedTool = defineTool({
  kind: 'tool',
  name: 'output-validated',
  title: 'Output validated tool',
  description: 'Used by the runtime contract suite to verify structured output validation.',
  inputSchema: z.object({}),
  outputSchema: z.object({ ok: z.boolean() }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run() {
    outputHandlerRuns += 1;
    return {
      text: 'intentionally invalid output',
      // Deliberately bypass the compile-time contract so runtime validation is exercised.
      structuredContent: { ok: 'not-a-boolean' } as unknown as { ok: boolean },
    };
  },
});

const scalarOutputTool = defineTool({
  kind: 'tool',
  name: 'scalar-output',
  title: 'Scalar output tool',
  description: 'Returns the JSON number zero to verify 2026-07-28 non-object structured content.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  run() {
    return {
      text: '0',
      structuredContent: 0,
    };
  },
});

const validationServer = defineServer({
  manifest: {
    id: 'runtime-validation',
    title: 'Runtime validation test server',
    version: '1.0.0',
    description: 'Internal test fixture for protocol/runtime validation.',
  },
  tools: [inputValidatedTool, outputValidatedTool, scalarOutputTool],
});

beforeEach(() => {
  inputHandlerRuns = 0;
  outputHandlerRuns = 0;
});

describe('runtime validation contract', () => {
  for (const mode of protocolTestModes) {
    describe(mode, () => {
      it('rejects invalid tool arguments before the business handler runs', async () => {
        await withMcpTestClient(validationServer, mode, async ({ client }) => {
          const result = await client.callTool({
            name: 'input-validated',
            arguments: { value: 'invalid' },
          });

          expect(result.isError).toBe(true);
          expect(inputHandlerRuns).toBe(0);
          expect(JSON.stringify(result.content)).toContain('Input validation error');
        });
      });

      it('turns invalid structured output into a tool-level failure', async () => {
        await withMcpTestClient(validationServer, mode, async ({ client }) => {
          const result = await client.callTool({
            name: 'output-validated',
            arguments: {},
          });

          expect(result.isError).toBe(true);
          expect(outputHandlerRuns).toBe(1);
          expect(JSON.stringify(result.content)).toContain('does not match its output schema');
        });
      });

      it('preserves a falsy scalar structured result through the era codec', async () => {
        await withMcpTestClient(validationServer, mode, async ({ client }) => {
          const result = await client.callTool({
            name: 'scalar-output',
            arguments: {},
          });

          expect(result.isError).not.toBe(true);
          expect(result.structuredContent).toEqual(
            mode === 'modern' ? 0 : { result: 0 },
          );
        });
      });
    });
  }
});
