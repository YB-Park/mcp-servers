# LLM Quick Guide: Add an MCP Server

If your task is **"add a new MCP server"**, start coding from this page. Do not study the whole framework first.

## Do this

1. Copy `servers/example` to `servers/<id>`.
2. Rename the package to `@mcp-server/<id>` in `servers/<id>/package.json`.
3. Replace the example capabilities in `servers/<id>/src` with the requested Tools/Resources/Prompts.
4. Export one server definition from `servers/<id>/src/index.ts` using `defineServer(...)`.
5. Register the package in the host:
   - add `@mcp-server/<id>: workspace:*` to `apps/host/package.json`;
   - add the TypeScript project reference to `apps/host/tsconfig.json`;
   - import the server and add it to `serverDefinitions` in `apps/host/src/registry.ts`.
6. Add the server project to root `tsconfig.json` for discoverability.
7. Run `pnpm install` if workspace dependencies changed, then commit the updated `pnpm-lock.yaml`.
8. Add tests for the new behavior.
9. Run `pnpm check`. If the change affects MCP core/runtime behavior, also run `pnpm test:conformance`.

The endpoint is automatically:

```text
/mcp/<id>
```

Server IDs are lowercase kebab-case.

## Tool template

Use `@mcp-platform/mcp-kit`. Do **not** import `@modelcontextprotocol/*` from `servers/*`.

```ts
import { defineTool } from '@mcp-platform/mcp-kit';
import * as z from 'zod/v4';

export const getThingTool = defineTool({
  kind: 'tool',
  name: 'get-thing',
  title: 'Get thing',
  description: 'Read one thing by id.',
  inputSchema: z.object({
    id: z.string().min(1).describe('Thing id'),
  }),
  outputSchema: z.object({
    id: z.string(),
    status: z.string(),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async run({ id }, ctx) {
    const result = { id, status: 'ok' };
    return {
      text: `Thing ${id}: ${result.status}`,
      structuredContent: result,
    };
  },
});
```

`inputSchema` types are inferred. Do not parse the same input again unless the business system requires a separate validation step.

## Server template

```ts
import { defineServer } from '@mcp-platform/mcp-kit';
import { getThingTool } from './tools/get-thing.js';

export const thingServer = defineServer({
  manifest: {
    id: 'thing',
    title: 'Thing MCP',
    version: '0.1.0',
    description: 'Access internal thing data.',
    owner: 'your-team',
    tags: ['internal'],
    visibility: 'internal',
  },
  instructions: 'Use this server only for thing-related work.',
  tools: [getThingTool],
});
```

## Rules that matter

- Keep business code inside `servers/<id>`; protocol/HTTP details belong to the platform.
- Prefer several focused Tools over one vague mega-tool.
- Tool names/descriptions/schemas are LLM-facing API: make them precise.
- Set read-only/destructive annotations accurately, but never treat annotations as authorization.
- Authentication is handled by the Host. Never read raw Authorization headers or tokens in server code.
- Use `ctx.identity` only when business logic truly needs the authenticated identity.
- Do not add agent-harness or model-specific behavior to an MCP server unless the task explicitly requires server-internal behavior.
- Do not invent framework abstractions for one server. Implement the business capability directly first.

## If something is unclear

Copy an existing pattern instead of guessing:

- complete server: `servers/example/src/index.ts`
- Tool: `servers/example/src/tools/hello.ts`
- host registration: `apps/host/src/registry.ts`
- client integration tests: `tests/integration/mcp-handler.test.ts` and `tests/integration/host-routing.test.ts`
- framework API details: `docs/guides/create-server.md`
- Tool design: `docs/standards/tool-design.md`
- repository rules: `AGENTS.md`

If framework behavior is still unclear, inspect the public types in `packages/mcp-kit` before reading protocol/runtime internals.

## Done means

- the new package builds;
- the server is registered at `/mcp/<id>`;
- Tool/Resource/Prompt behavior has tests;
- `pnpm check` is green;
- existing MCP conformance remains green when relevant;
- no secrets or raw credentials are committed.
