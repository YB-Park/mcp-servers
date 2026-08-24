# Testing Architecture

Testing is layered so failures identify which contract broke.

## Layer 1: framework unit tests

Test pure `mcp-kit` contracts and deterministic server business logic without HTTP or MCP negotiation. Current bootstrap coverage validates server IDs, duplicate capability rejection, and example tool behavior.

## Layer 2: MCP integration tests

Create a real official MCP `Client` and connect it to the runtime's web-standard handler in-process. The same endpoint is exercised twice:

- default/legacy negotiation, representing the 2025-era initialize flow still important for existing clients
- `versionNegotiation: { mode: 'auto' }`, proving the 2026-07-28 modern path

The contract test lists/calls tools, lists/reads resources, retrieves prompts, and checks server instructions.

## Layer 3: HTTP host smoke tests

Bind the actual Node host on an ephemeral port, verify `/health`, verify unknown-server routing, connect an official MCP client to `/mcp/example`, and call `add`. This catches Node adapter, headers, URL routing, listener, and lifecycle failures that in-process tests cannot.

## Layer 4: external compatibility gates

The bootstrap leaves official MCP Inspector CLI, conformance, and explicit VS Code automation as the next compatibility layer. Add them once their invocation/versioning is pinned reproducibly. Protocol conformance and VS Code behavior remain separate release gates.

## Internal integrations

Company-only databases/APIs are not required for portable CI. Their tests live beside their server modules and run in an internal environment when credentials/network access are available.

## CI policy

`pnpm check` performs a TypeScript build, all Vitest suites, and the real HTTP smoke test. Docker image construction is a separate CI job so packaging failures are visible independently.

## Test design rules

- Test public behavior, not private SDK implementation details.
- Every framework bug gets a regression test at the lowest layer that can reproduce it.
- Example code must be executable and self-verifying.
- Avoid protocol mocks when an in-process official client/handler pair is cheap enough.
- Never claim VS Code compatibility solely from unit or conformance tests.
