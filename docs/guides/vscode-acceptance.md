# VS Code Acceptance

MCP protocol conformance is necessary but does not prove that a server is discoverable, trustworthy, pleasant to use, or diagnosable in VS Code. This checklist is the release-candidate gate for the VS Code-first user experience.

Record evidence for the exact build and harness tested. Do not write only "works in VS Code".

## Evidence header

```text
Date:
Tester:
OS:
VS Code version:
VS Code commit (Help: About):
Repository commit SHA:
Host URL:
Configuration surface: .vscode/mcp.json | portable .mcp.json | Agent Plugin | other
Harness: local/default | Copilot Agent Host | other
Permission level:
Result: PASS | FAIL
Upstream issue/exception (if any):
Notes:
```

## 1. Start from clean client state

1. Start the repository host and verify `/health`.
2. Run `MCP: Reset Trust` so first-start trust is not hidden by an older decision.
3. Run `MCP: Reset Cached Tools` so discovery is not satisfied from stale metadata.
4. Run `Chat: Reset Tool Confirmations` so representative approval behavior is observable.
5. If individual approval policies matter, inspect them with `Chat: Manage Tool Approval` before starting the test.
6. Confirm that an older host process is not still listening on the endpoint.

Record any organization policy that disables or changes one of these surfaces. Enterprise policy is part of the tested environment, not an MCP server defect.

## 2. Register the remote HTTP server

Use the reference `.vscode/mcp.json` shape from `examples/vscode/mcp.json` for the primary workspace flow.

Verify:

- the server is discovered as a remote HTTP MCP server;
- starting it through the normal MCP management flow presents the expected trust prompt;
- the trust prompt exposes enough configuration detail to identify the server being trusted;
- `MCP: List Servers` shows the server and lifecycle actions such as start, stop, restart, and Show Output;
- enable/disable state does not unexpectedly rewrite the checked-in configuration.

Note: launching a server directly from some `mcp.json` editor actions can bypass the ordinary trust prompt. Use the normal managed start path when testing trust itself.

## 3. Verify tool discovery and selection UX

For a local/default harness, use Configure Tools / the Chat tool picker. For the Copilot harness on Agent Host, use the Agent Customizations Tools section and record that its tool enablement is profile-wide across sessions.

Inspect representative tools and verify:

- stable name;
- readable title;
- description that makes the intended use clear without repository knowledge;
- understandable input fields and schema descriptions;
- annotations consistent with behavior, especially read-only/destructive semantics;
- expected enabled/disabled state.

Invoke `hello` and `add` from chat. Verify the intended MCP server/tool is selected and the result is usable by the agent.

The reference server deliberately stays below the 128 directly enabled tool budget. If a future catalog exceeds it, separately test VS Code virtual-tool behavior rather than treating the 128 limit as a protocol failure.

## 4. Verify approval behavior

Exercise at least one read-only operation and, once the platform has one, a representative side-effecting operation.

Verify:

- confirmation behavior matches the actual risk and MCP annotations;
- model-generated input can be reviewed before execution when confirmation is shown;
- saved approvals are visible through `Chat: Manage Tool Approval`;
- after `Chat: Reset Tool Confirmations`, the expected confirmation is shown again.

Annotations and client approvals are UX/safety controls. They do not replace server-side authorization.

## 5. Verify resources

Run `MCP: Browse Resources` or attach an MCP Resource through Add Context.

Verify `example://about` is discoverable, opens/attaches successfully, has the expected title/MIME type, and provides readable content.

For future binary/resource-template features, add explicit acceptance rows instead of assuming text-resource success covers them.

## 6. Verify prompts

Invoke the reference prompt using the MCP slash-command surface (for example `/company-example.greet-person`, using the actual installed server name).

Verify argument prompting/rendering is understandable and the resulting request references the intended `hello` workflow.

When a no-argument prompt is present, also verify that it can be invoked without synthetic empty arguments. This guards the same client/runtime boundary exercised by the MCP conformance suite.

## 7. Verify failure diagnostics and recovery

Stop the MCP host while VS Code remains configured to use it.

Verify:

- VS Code reports server failure rather than silently dropping the capability;
- `MCP: List Servers` exposes Show Output;
- MCP Output contains enough endpoint/error information to distinguish connection failure from a healthy server;
- after restarting the host, restart/reconnect recovers without editing the configuration.

Also test an unknown server endpoint once (for example `/mcp/missing`) and confirm its diagnostics are distinguishable from a healthy endpoint.

## 8. Verify capability refresh

After changing server metadata or capabilities in a test build:

1. run `MCP: Reset Cached Tools`;
2. restart the MCP server;
3. confirm that the changed capability list/metadata is visible;
4. ensure stale tools are not still selectable.

This check catches client-cache regressions that protocol integration tests cannot observe.

## 9. Portable/plugin distribution path

When portability is a release requirement, repeat representative checks using the distribution surface being shipped:

- existing Copilot/Claude-compatible `.mcp.json` (`mcpServers`), or
- future Agent Plugins 1.0 package (`plugin.json` + portable `mcp.json`).

Do not assume these surfaces have identical trust semantics. For example, plugin-provided MCP servers can inherit trust from plugin installation rather than showing the same workspace-server startup prompt.

## Pass criteria

A release candidate passes VS Code acceptance only when:

- registration/start/trust is understandable for the tested distribution surface;
- expected tools/resources/prompts are discoverable;
- metadata is readable and accurate;
- representative calls succeed;
- approval behavior is appropriate and resettable;
- stale discovery state can be cleared and refreshed;
- failure diagnostics are actionable and recovery works;
- the exact VS Code build, harness, configuration surface, and repository commit are recorded.

If a check fails because of a known VS Code issue rather than a server defect, record the upstream issue and keep the exception explicit. Do not weaken protocol/framework tests to compensate for a client-specific defect.
