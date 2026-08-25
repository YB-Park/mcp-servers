# Agent Guide

This repository is an MCP server framework/runtime, not an agent harness.

## Read first

1. `docs/architecture/overview.md`
2. `docs/standards/tool-design.md`
3. `docs/guides/create-server.md`
4. `docs/architecture/testing-strategy.md`
5. `docs/guides/vscode.md`
6. the reference implementation under `servers/example`

## Architectural rules

- Keep server modules independent from `@modelcontextprotocol/*`; only runtime/protocol adapter code may import the official SDK.
- Keep canonical HTTP endpoints at `/mcp/:serverId`.
- Stateless HTTP is the default. Do not add session state unless the capability truly requires it.
- Do not implement protocol negotiation manually; delegate wire behavior to the official SDK adapter.
- Do not make MCP annotations security controls. Authorization must be deterministic and server-side.
- Never expose Authorization headers, raw access tokens, or provider-private credential payloads to server/tool business code. Runtime/auth adapters may map non-secret identity metadata into `ExecutionContext`.
- Keep VS Code-specific distribution/configuration outside the framework core. Workspace config, registries, and Agent Plugin packaging are adapters around the same server definition.
- Do not narrow MCP core merely to make a wrapper API simpler. Preserve legal capability names, rich content blocks, binary resources, multimodal prompts, legal structured output, and omitted optional fields through `mcp-kit`/runtime contracts.
- Prefer a simple direct implementation over speculative factories/providers. Add an abstraction only at a confirmed external change boundary or after repeated implementation pressure.
- Documentation is part of the public API. Update guides, examples, and LLM instructions with public API changes.

## Public API philosophy

`@mcp-platform/mcp-kit` is the intended surface for MCP module authors. Happy-path code should use `defineServer`, `defineTool`, `defineResource`, and `definePrompt`. Advanced raw-SDK escape hatches may exist later, but must not become the default path.

The easy path must remain easy: text Tool results, static Resources, schema-driven Tool/Prompt arguments, and no-argument Prompts should not require SDK knowledge. Advanced MCP content should remain expressible without importing the SDK from a server module.

## Testing requirements

- Framework contract changes require unit/type-contract coverage.
- Runtime/protocol changes require official MCP Client integration coverage across the relevant legacy/modern matrix.
- Host/routing/security changes require real HTTP coverage.
- Changes affecting MCP core behavior must keep `pnpm test:conformance` green; do not add a broad expected-failure merely to land a change.
- VS Code-facing metadata/config/distribution changes require contract updates and, for a release candidate, real VS Code acceptance evidence.
- Never claim VS Code compatibility solely from unit, protocol, or conformance tests.
