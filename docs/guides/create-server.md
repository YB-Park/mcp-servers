# Create a Server Module

Use `servers/example` as the reference implementation.

1. Create `servers/<id>` with a workspace `package.json` and TypeScript project.
2. Export one `defineServer(...)` definition from `src/index.ts`.
3. Put canonical metadata in the server manifest: stable `id`, title, version, description, owner/tags when useful.
4. Implement capabilities with `defineTool`, `defineResource`, and `definePrompt` from `@mcp-platform/mcp-kit`.
5. Never import `@modelcontextprotocol/*` from a server module.
6. Add the server to the host registry explicitly. v0.1 favors visible static registration over dynamic plugin loading.
7. Add unit tests for business logic and portable contract/integration tests for client-visible behavior.

A server ID must be lowercase kebab-case and becomes its endpoint: `database` -> `/mcp/database`.

## Schema-driven types

`defineTool` and `definePrompt` infer handler arguments from their Zod schema. Do not parse the same input again in normal handlers; the MCP runtime validates it before invoking business code.

```ts
const getOrder = defineTool({
  kind: 'tool',
  name: 'get-order',
  title: 'Get order',
  description: 'Read one order by id.',
  inputSchema: z.object({ orderId: z.string() }),
  outputSchema: z.object({ status: z.string() }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
  },
  run({ orderId }, ctx) {
    // orderId is inferred as string; structuredContent is checked against outputSchema.
    return {
      text: `order=${orderId}`,
      structuredContent: { status: 'ready' },
    };
  },
});
```

If handler code needs a second parse to obtain usable types, treat that as a framework DX bug rather than copying the workaround into every server.

## Structured output across MCP revisions

For `2026-07-28`, MCP allows any JSON value as `structuredContent` and an unrestricted `outputSchema` root. Arrays and primitives are therefore valid framework outputs:

```ts
const count = defineTool({
  kind: 'tool',
  name: 'count',
  title: 'Count',
  description: 'Return an exact count.',
  inputSchema: z.object({}),
  outputSchema: z.number(),
  run() {
    return { text: '0', structuredContent: 0 };
  },
});
```

Do not test structured output with a truthy check: `0`, `false`, `null`, and `""` are valid JSON values. The official MCP SDK projects non-object output into a legacy-compatible `{ result: ... }` envelope when serving 2025-era clients; server business code stays revision-neutral.
