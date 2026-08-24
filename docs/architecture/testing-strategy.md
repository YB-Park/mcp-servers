# Testing Strategy

Testing is part of the platform contract. A green test suite must answer more than "does the example tool return 42?" It must tell us which boundary failed: business logic, framework contract, MCP protocol adaptation, HTTP hosting, security, client compatibility, packaging, or a company-only dependency.

## Principles

1. **Test the narrowest useful boundary first.** Unit tests should not need MCP or HTTP.
2. **Use the official MCP client for protocol tests.** Do not validate our adapter only with hand-written JSON-RPC fixtures.
3. **Exercise both supported protocol eras.** The same server definition must serve the legacy path and modern `2026-07-28` negotiation without capability drift.
4. **Keep negative-path tests first-class.** Invalid schemas, unknown routes, bad Host/Origin headers, handler failures, and malformed outputs are part of the contract.
5. **Separate deterministic compatibility from model behavior.** Tool metadata and discovery can be gated in CI; whether a particular model chooses a tool is probabilistic and belongs in an evaluation layer, not a hard protocol gate.
6. **Portable core tests never require company credentials.** Internal integrations add their own optional or internal-runner suites.

## Test layers

| Layer | Purpose | Transport | Default gate |
| --- | --- | --- | --- |
| Unit | Pure framework/module logic | none | every PR |
| Contract | Public metadata, discovery quality, client constraints | in-process MCP | every PR |
| Runtime integration | MCP SDK adapter, schemas, error semantics, protocol eras | in-process Streamable HTTP handler | every PR |
| Host/security | routing, Host/Origin guards, HTTP status behavior | real Node HTTP listener where useful | every PR |
| Smoke | built artifact starts and serves a real endpoint | real HTTP | every PR |
| Conformance | Spec-defined MCP behavior | real HTTP | compatibility gate |
| VS Code acceptance | install/trust/discovery/tool picker/resources/prompts/diagnostics | real VS Code | release candidate |
| Internal integration | company APIs, DBs, IAM, network policy | company environment | internal gate |

## Protocol compatibility matrix

The framework-owned test helper `@mcp-platform/testing` creates official MCP clients against the same `ServerDefinition` in two modes:

- `legacy`: default client negotiation, representing the 2025-era compatibility path.
- `modern`: automatic negotiation and assertion of `2026-07-28`.

Every framework-level capability test that could drift between protocol eras should use this matrix. Business-only unit tests should not.

## Runtime validation cases

At minimum the portable suite must prove:

- tool input schema rejection happens before business code executes;
- invalid declared structured output becomes a tool-level failure;
- tool/resource/prompt discovery works through the official client;
- server instructions are delivered;
- legacy and modern paths expose equivalent core capabilities;
- unknown HTTP server ids and invalid routes are rejected;
- non-loopback hosting requires an explicit Host allowlist;
- untrusted Host and Origin headers are rejected.

## VS Code acceptance

Protocol conformance is necessary but not sufficient. Before a release candidate is called VS Code-compatible, verify the user-facing flow:

1. register the remote server with workspace `.vscode/mcp.json`;
2. verify the server appears in MCP management UI and trust flow;
3. verify tools have readable title/description/schema in the tool picker;
4. verify resources and prompts are discoverable;
5. invoke representative read-only and mutating tools and inspect confirmation behavior;
6. verify MCP Output/diagnostics are useful when the server is unavailable or returns an error;
7. repeat the portable configuration path with workspace `.mcp.json` when Agent Host portability is a release requirement.

VS Code currently allows at most 128 enabled tools in one chat request. A single server exceeding that count is therefore a contract failure for our VS Code-first target; broader multi-server tool pressure should be monitored as a quality warning rather than hidden by the framework.

## MCP Inspector and conformance

MCP Inspector is valuable for exploratory debugging and human inspection, but it is not the main CI oracle. The automated compatibility gate should use the official MCP conformance runner against a real HTTP endpoint, with the runner version and MCP spec revision pinned in CI.

Target command shape:

```bash
npx @modelcontextprotocol/conformance server \
  --url http://127.0.0.1:3000/mcp/example \
  --suite active
```

Do not blindly enable every optional conformance scenario. Capability-specific scenarios must be classified as supported, intentionally skipped, or expected-failure with an issue/ADR explaining why.

## Model/tool-selection evaluations

Later we should add non-blocking evaluations for questions such as "does an agent choose the right tool from realistic descriptions?" These evaluations should record model/version, prompt set, enabled tool set, and pass rate. They must never replace deterministic authorization or protocol tests.

## Company-only integrations

Company servers should provide three levels where practical:

- pure tests with fakes for business rules;
- portable contract tests using the framework test client;
- opt-in live tests requiring explicit environment variables/credentials and running only on approved internal machines or runners.

A missing internal system must not make the public framework CI flaky.
