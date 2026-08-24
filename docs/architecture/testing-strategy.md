# Testing Strategy

Testing is part of the platform contract. A green test suite must answer more than "does the example tool return 42?" It must tell us which boundary failed: business logic, framework contract, MCP protocol adaptation, HTTP hosting, security, client compatibility, packaging, or a company-only dependency.

## Principles

1. **Test the narrowest useful boundary first.** Unit tests should not need MCP or HTTP.
2. **Use the official MCP client for protocol tests.** Do not validate our adapter only with hand-written JSON-RPC fixtures.
3. **Exercise both supported protocol eras.** The same server definition and real HTTP endpoint must serve the legacy path and modern `2026-07-28` negotiation without capability drift.
4. **Keep negative-path tests first-class.** Invalid schemas, unknown routes, bad Host/Origin headers, handler failures, and malformed outputs are part of the contract.
5. **Test central-host isolation explicitly.** Multiple MCP modules share one process, but capability discovery and execution must remain scoped to `/mcp/:serverId`.
6. **Separate deterministic compatibility from model behavior.** Tool metadata and discovery can be gated in CI; whether a particular model chooses a tool is probabilistic and belongs in an evaluation layer, not a hard protocol gate.
7. **Portable core tests never require company credentials.** Internal integrations add their own optional or internal-runner suites.

## Test layers

| Layer | Purpose | Transport | Default gate |
| --- | --- | --- | --- |
| Unit | Pure framework/module logic and compile-time DX contracts | none | every PR |
| Contract | Public metadata, discovery quality, client configuration constraints | in-process MCP / files | every PR |
| Runtime integration | MCP SDK adapter, schemas, error semantics, protocol eras | in-process Streamable HTTP handler | every PR |
| Host/security | routing, multi-server isolation, Host/Origin guards | real Node HTTP | every PR |
| Smoke | built application starts; legacy and modern clients complete a representative call | real HTTP | every PR |
| Conformance | Spec-defined MCP behavior | real HTTP | compatibility gate |
| VS Code acceptance | install/trust/discovery/tool picker/resources/prompts/diagnostics | real VS Code | release candidate |
| Internal integration | company APIs, DBs, IAM, network policy | company environment | internal gate |

## Framework-owned test helpers

`@mcp-platform/testing` is a public testing surface for server authors. It owns official MCP client bootstrap and protocol-mode selection so individual servers do not copy transport details.

- `withMcpTestClient(server, mode, fn)` runs against the in-process runtime handler.
- `withMcpHttpTestClient(url, mode, fn)` runs against a real HTTP endpoint.
- `protocolTestModes` currently contains `legacy` and `modern`.

When MCP lifecycle/SDK details change, compatibility bootstrap should normally change here rather than across every server test suite.

## Protocol compatibility matrix

- `legacy`: default client negotiation, representing the stateful 2025-era compatibility path.
- `modern`: automatic negotiation and assertion of `2026-07-28`, representing the stateless lifecycle.

Framework-level capabilities that could drift between protocol eras should use this matrix. Business-only unit tests should not. At least one smoke path must exercise both modes over the actual Node HTTP listener, not only the in-process handler.

## Runtime validation cases

At minimum the portable suite must prove:

- tool input schema rejection happens before business code executes;
- invalid declared structured output becomes a tool-level failure;
- tool/resource/prompt discovery works through the official client;
- server instructions are delivered;
- legacy and modern paths expose equivalent core capabilities;
- unknown HTTP server ids and invalid routes are rejected;
- multiple server modules do not leak capabilities across endpoints;
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

MCP Inspector is valuable for exploratory debugging and human inspection, but it is not the main CI oracle.

The official conformance runner spans different lifecycle revisions and capability-specific scenarios. In particular, pre-`2026-07-28` dated revisions use a stateful lifecycle while `2026-07-28` uses the stateless lifecycle. Therefore conformance must not be enabled as a single opaque "all green" command against a production-oriented example server.

The compatibility gate should instead:

1. pin the conformance runner/referee version and target spec revisions;
2. use a dedicated conformance fixture/server when scenarios require special progress/logging/sampling/resource behavior;
3. run the relevant revision lifecycle intentionally;
4. keep an `expected-failures.yaml` only for explicitly unsupported or extension-tagged scenarios;
5. fail CI on any new unexpected failure;
6. document every expected failure with an issue/ADR and remove it when support lands.

Target command shape for a compatible fixture:

```bash
npx @modelcontextprotocol/conformance server \
  --url http://127.0.0.1:3000/mcp/conformance \
  --suite active \
  --expected-failures tests/conformance/expected-failures.yaml
```

Do not blindly enable every optional scenario. Capability-specific scenarios must be classified as supported, intentionally skipped, or expected-failure with an issue/ADR explaining why.

## Model/tool-selection evaluations

Later we should add non-blocking evaluations for questions such as "does an agent choose the right tool from realistic descriptions?" These evaluations should record model/version, prompt set, enabled tool set, and pass rate. They must never replace deterministic authorization or protocol tests.

## Company-only integrations

Company servers should provide three levels where practical:

- pure tests with fakes for business rules;
- portable contract tests using the framework test client;
- opt-in live tests requiring explicit environment variables/credentials and running only on approved internal machines or runners.

A missing internal system must not make the public framework CI flaky.
