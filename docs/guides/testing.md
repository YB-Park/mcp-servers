# Testing Guide

The repository deliberately separates test layers so a failure identifies the broken boundary.

After installing dependencies:

```bash
pnpm build
pnpm test:unit
pnpm test:contract
pnpm test:integration
pnpm test:smoke
```

Run `pnpm check` before requesting review of framework/runtime changes.

## What each command proves

- `test:unit`: pure framework and server business logic without MCP transport.
- `test:contract`: client-visible discovery/metadata expectations, including VS Code-facing constraints.
- `test:integration`: official MCP client against the runtime handler, schema/error behavior, and legacy/modern protocol matrix.
- `test:smoke`: actual Node HTTP listener, routing, MCP connection, and representative tool execution.

Use `@mcp-platform/testing` instead of rewriting MCP client bootstrap in every server test:

```ts
import { withMcpTestClient } from '@mcp-platform/testing';

await withMcpTestClient(myServer, 'modern', async ({ client }) => {
  const tools = await client.listTools();
  // assertions...
});
```

Framework changes that affect MCP behavior should normally be exercised in both `legacy` and `modern` modes. Business logic that has no protocol dependency should stay a fast unit test.

For company-only integrations, keep network/credential tests opt-in locally or on approved internal runners and document required environment variables. Never weaken the portable core suite because an internal dependency is unavailable.

See `docs/architecture/testing-strategy.md` for the complete compatibility, conformance, VS Code acceptance, and model-evaluation strategy.
