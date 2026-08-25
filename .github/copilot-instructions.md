# Copilot repository instructions

Follow `AGENTS.md` as the repository contract.

When adding an MCP server, start immediately from `docs/guides/llm-create-server.md` and `servers/example`. Prefer copying an existing pattern over studying or changing framework internals.

Do not import the official MCP SDK from `servers/*`; use `@mcp-platform/mcp-kit` only.

Prefer small, deterministic tools with explicit schemas, useful titles/descriptions, structured output, and correct read-only/destructive annotations. Treat annotations as UX hints only.

Authentication is enforced by the Host. Never read, log, or propagate raw Authorization headers/API keys from server business code.

Before finishing code changes, run the narrowest relevant test layer and then `pnpm check` when dependencies/environment permit. Keep MCP conformance green for changes that affect MCP core/runtime behavior.
