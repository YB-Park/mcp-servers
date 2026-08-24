# Testing Architecture

Testing is layered so failures identify which contract broke.

## Layer 1: framework unit tests

Test pure `mcp-kit` contracts and validation without HTTP or MCP client negotiation. Examples: invalid server IDs, duplicate capability names, tool-result mapping helpers.

## Layer 2: MCP integration tests

Create a real official MCP `Client` and connect it to the runtime's web-standard handler in-process. Assert capability discovery, tool schemas, tool calls, resource reads, prompt retrieval, server instructions, and both successful/error results. This is the primary protocol-adapter test.

## Layer 3: HTTP host smoke tests

Bind the actual Node host on an ephemeral port, verify `/health`, connect an MCP client to `/mcp/example`, list/call a tool, and verify unknown server routes fail predictably. This catches routing/body/header/listener problems that in-process handler tests cannot.

## Layer 4: external compatibility gates

As the bootstrap matures, add MCP Inspector CLI, official conformance, and explicit VS Code compatibility checks. Protocol conformance and VS Code behavior are separate release gates.

## Internal integrations

Company-only databases/APIs are not required for public CI. Their tests live beside their server modules and run in an internal environment when credentials/network access are available.

## Test design rules

- Test public behavior, not private SDK implementation details.
- Every framework bug gets a regression test at the lowest layer that can reproduce it.
- Example code must be executable and self-verifying.
- Avoid mocks for the MCP protocol when an in-process official client/handler pair is cheap enough.
