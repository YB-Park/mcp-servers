# Testing Strategy

Testing is part of the platform contract. A green suite must tell us which boundary failed: business logic, framework contract, MCP protocol adaptation, HTTP hosting, security, VS Code compatibility, packaging, or a company-only dependency.

## Principles

1. **Test the narrowest useful boundary first.** Unit tests should not need MCP or HTTP.
2. **Use the official MCP client for protocol tests.** Do not validate our adapter only with hand-written JSON-RPC fixtures.
3. **Exercise both supported protocol eras.** The same server definition and real HTTP endpoint must serve the legacy path and modern `2026-07-28` path without capability drift.
4. **Keep negative paths first-class.** Invalid schemas, unknown routes, bad Host/Origin headers, handler failures, malformed outputs, and omitted optional fields are contracts too.
5. **Test central-host isolation explicitly.** Multiple MCP modules share one process, but discovery and execution remain scoped to `/mcp/:serverId`.
6. **Do not let the wrapper narrow MCP core.** Rich Tool content, binary Resources, multimodal Prompts, structured output, and no-argument Prompts are tested through `mcp-kit`, not by bypassing it with the SDK.
7. **Separate deterministic compatibility from model behavior.** Tool metadata/discovery are CI gates; whether a particular model chooses the best tool is probabilistic evaluation work.
8. **Portable core tests never require company credentials.** Internal integrations add separate approved-environment suites.

## Test layers

| Layer | Purpose | Transport | Default gate |
| --- | --- | --- | --- |
| Build/type | strict TypeScript and public API inference | none | every PR |
| Unit | pure framework/module logic | none | every PR |
| Contract | public metadata, VS Code-facing quality constraints, config shapes | in-process MCP / files | every PR |
| Runtime integration | SDK adapter, schemas, content types, errors, protocol eras | in-process Streamable HTTP | every PR |
| Host/security | routing, module isolation, Host/Origin guards | real Node HTTP | every PR |
| Smoke | built host + representative legacy/modern calls | real HTTP | every PR |
| MCP core conformance | selected spec-defined `2026-07-28` core behavior | real HTTP | every PR |
| Docker | reproducible container build | container build | every PR |
| VS Code acceptance | trust/discovery/tools/resources/prompts/approvals/diagnostics/recovery | real VS Code | release candidate |
| Internal integration | company APIs, DBs, IAM, network policy | company environment | internal gate |

## Framework-owned test helpers

`@mcp-platform/testing` is a public testing surface for server authors. It owns official MCP Client bootstrap and protocol-mode selection so individual servers do not copy transport details.

- `withMcpTestClient(server, mode, fn)` runs against the in-process runtime handler.
- `withMcpHttpTestClient(url, mode, fn)` runs against a real HTTP endpoint.
- `protocolTestModes` contains `legacy` and `modern`.

When MCP lifecycle/SDK details change, compatibility bootstrap should normally change here rather than across every server suite.

## Protocol compatibility matrix

- `legacy`: the compatibility path required by current initialization-era clients.
- `modern`: explicit `2026-07-28` negotiation and stateless lifecycle behavior.

Framework capabilities that can drift between protocol eras use this matrix. Business-only unit tests do not. At least one smoke path exercises both modes against the actual Node listener.

## Runtime contracts

The portable suite must prove at least:

- tool input rejection happens before business code executes;
- declared structured output is validated and all legal JSON values, including falsy scalars, are preserved;
- rich Tool content survives the adapter;
- text, binary, and multiple Resource contents survive the adapter;
- multimodal Prompt messages survive the adapter;
- no-argument Prompts work when `arguments` is omitted entirely;
- server instructions and discovery metadata are delivered;
- legacy and modern paths expose equivalent intended capabilities;
- unknown server ids/routes are rejected;
- MCP modules do not leak capabilities across endpoints;
- non-loopback hosting requires an explicit Host allowlist;
- untrusted Host and Origin headers are rejected.

## MCP conformance

The official conformance runner is a blocking compatibility oracle, but it must not distort production server design. We therefore use a dedicated test-only fixture at `tests/conformance/fixture.ts` implemented only through the public `mcp-kit` API.

`pnpm test:conformance` runs an explicit `2026-07-28` core scenario allowlist against a real host. The currently selected profile covers 20 Tool, Resource, Prompt, HTTP, SSE, caching, DNS-rebinding, and error scenarios. All 20 must pass; the profile currently has **no expected-failure baseline**.

The runner version is explicitly pinned by `tests/conformance/run-core.ts`. Updating that version is a test-vector/spec-compatibility change and requires review of scenario/check changes, not a casual dependency bump.

We intentionally do not run every optional conformance scenario against the production example server. Progress, elicitation, sampling, completion, resource-template, and other capability-specific scenarios should enter the blocking profile only when the framework deliberately supports the corresponding capability.

If an expected-failure baseline is ever required, use the narrowest `scenario:check-id` exception, document its reason/upstream issue, and remove stale exceptions. A broad scenario-level waiver is a last resort.

## VS Code acceptance

Protocol conformance does not prove client UX. The release-candidate procedure is documented in [`../guides/vscode-acceptance.md`](../guides/vscode-acceptance.md).

Acceptance starts from reset trust, cached-tool, and tool-confirmation state; records exact VS Code build/harness/config surface; exercises tools/resources/prompts; verifies approval behavior; tests stale capability refresh; and checks failure diagnostics/recovery through MCP Output.

VS Code has a 128 directly enabled tool budget per chat request and can virtualize larger tool catalogs. Our single-reference-server contract keeps within 128 as a deliberate quality guardrail, not as an MCP protocol limit.

## MCP Inspector

MCP Inspector remains useful for exploratory debugging and human inspection, but it is not the main CI oracle. Deterministic tests and the official conformance profile are release gates; Inspector is a diagnostic companion.

## Model/tool-selection evaluations

Later, add non-blocking evaluations for questions such as whether an agent chooses the right tool from realistic descriptions. Record model/version, prompt set, enabled tool set, harness, and pass rate. These evaluations never replace deterministic authorization, protocol, or VS Code acceptance tests.

## Company-only integrations

Company servers should provide three levels where practical:

- pure tests with fakes for business rules;
- portable contract/integration tests through the framework testing API;
- opt-in live tests requiring explicit credentials and running only on approved internal machines/runners.

A missing internal system must not make portable framework CI flaky.
