# Agent Guide

This repository is an MCP server framework/runtime, not an agent harness.

## Read first

1. `docs/architecture/overview.md`
2. `docs/standards/tool-design.md`
3. `docs/guides/create-server.md`
4. `docs/architecture/testing.md`
5. the reference implementation under `servers/example`

## Architectural rules

- Keep server modules independent from `@modelcontextprotocol/*`; only runtime/protocol adapter code may import the official SDK.
- Keep canonical HTTP endpoints at `/mcp/:serverId`.
- Stateless HTTP is the default. Do not add session state unless the capability truly requires it.
- Do not implement protocol negotiation manually; delegate wire behavior to the official SDK adapter.
- Do not make MCP annotations security controls. Authorization must be deterministic and server-side.
- Keep VS Code-specific distribution/configuration outside the framework core.
- Prefer a simple direct implementation over speculative factories/providers. Add an abstraction only at a confirmed external change boundary or after repeated implementation pressure.
- Documentation is part of the public API. Update guides and examples with public API changes.

## Public API philosophy

`@mcp-platform/mcp-kit` is the intended surface for MCP module authors. Happy-path code should use `defineServer`, `defineTool`, `defineResource`, and `definePrompt`. Advanced raw-SDK escape hatches may exist later, but must not become the default path.

## Testing requirements

Changes to framework contracts should include unit tests. Runtime/protocol changes should include MCP client integration tests. Host/routing changes should include HTTP smoke coverage. Never claim VS Code compatibility solely from unit tests.
