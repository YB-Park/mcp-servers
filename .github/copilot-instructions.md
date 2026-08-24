# Copilot repository instructions

Follow `AGENTS.md` as the repository contract.

When adding an MCP server, start from `servers/example` and `docs/guides/create-server.md`. Do not import the official MCP SDK from `servers/*`; use `@mcp-platform/mcp-kit` only.

Prefer small, deterministic tools with explicit schemas, useful titles/descriptions, structured output, and correct read-only/destructive annotations. Treat annotations as UX hints only.

Before finishing code changes, run the narrowest relevant test layer and then `pnpm check` when dependencies/environment permit.
