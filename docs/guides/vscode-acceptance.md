# VS Code Acceptance

MCP protocol conformance is necessary but does not prove that the server is pleasant or diagnosable in VS Code. This checklist is the release-candidate gate for the VS Code-first user experience.

Record the evidence for the exact build you tested. Do not write only "works in VS Code".

## Evidence header

```text
Date:
Tester:
OS:
VS Code version:
Commit SHA:
Host URL:
Configuration surface: .vscode/mcp.json | .mcp.json | both
Result: PASS | FAIL
Notes:
```

## Clean start

1. Start the repository host and verify `/health`.
2. Run `MCP: Reset Trust` so the trust flow is not hidden by an old decision.
3. Run `MCP: Reset Cached Tools` so discovery is not satisfied from stale metadata.
4. If testing a failure/recovery path, make sure an older host process is not still listening on the endpoint.

## Workspace HTTP configuration

Use the reference `.vscode/mcp.json` shape from `examples/vscode/mcp.json`.

Verify:

- the server is discovered as a remote HTTP MCP server;
- first start presents the expected trust flow when applicable;
- `MCP: List Servers` shows the server and allows start/stop/restart/output actions;
- enable/disable state does not mutate the checked-in configuration;
- restarting after a server metadata change refreshes the expected capabilities.

## Tool discovery and invocation

Open Configure Tools / the tool picker and verify the reference tools.

For each representative tool, inspect:

- stable name;
- readable title;
- description that makes the intended use clear without repository knowledge;
- understandable input fields;
- annotations consistent with behavior, especially read-only/destructive semantics.

Invoke `hello` and `add` from chat. Verify the correct MCP server/tool is shown and the result is usable by the agent. Approval/confirmation behavior should match the tool's actual risk; annotations are UX hints, not authorization controls.

## Resources

Run `MCP: Browse Resources` or use Add Context > MCP Resources.

Verify `example://about` is discoverable, opens/attaches successfully, has the expected title/MIME type, and provides readable content.

## Prompts

Invoke the reference prompt using the MCP slash-command surface (for example `/company-example.greet-person`, using the actual installed server name).

Verify argument prompting/rendering is understandable and the resulting request references the intended `hello` workflow.

## Failure and diagnostics

Stop the MCP host while VS Code is configured to use it.

Verify:

- VS Code reports the server failure rather than silently dropping the capability;
- `MCP: List Servers` exposes Show Output;
- MCP Output contains enough endpoint/error information to diagnose the failure;
- after restarting the host, the server can recover through restart/reconnect without editing the configuration.

Also test an unknown server endpoint once (for example `/mcp/missing`) and confirm the resulting diagnostics are distinguishable from a healthy endpoint.

## Portable configuration / Agent Host

When portability is part of the release, repeat the representative checks with `examples/vscode/.mcp.json`.

Verify the portable top-level `mcpServers` shape works independently of `.vscode/mcp.json`. Do not rely on `${input:...}` behavior for this path because Agent Host does not receive interactive-input servers from the VS Code workspace configuration.

## Pass criteria

A release candidate passes VS Code acceptance only when:

- registration/start/trust is understandable;
- expected tools/resources/prompts are discoverable;
- metadata is readable and accurate;
- representative calls succeed;
- failure diagnostics are actionable;
- the tested configuration surface(s) are recorded with an exact VS Code version.

If a check fails because of a known VS Code issue rather than a server defect, record the upstream issue and keep the exception explicit. Do not silently weaken protocol or framework tests to compensate for a client-specific defect.
