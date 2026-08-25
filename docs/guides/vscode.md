# VS Code Setup

The platform is VS Code-first, but VS Code exposes MCP through multiple configuration and distribution surfaces. Keep the framework runtime independent from any one file format so client packaging can evolve without changing server business code.

## VS Code workspace/user configuration

Use `.vscode/mcp.json` for the normal VS Code workspace flow:

```json
{
  "servers": {
    "company-example": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp/example"
    }
  }
}
```

The repository keeps this example at `examples/vscode/mcp.json`.

## Portable Copilot/plugin configuration

Existing Copilot/Claude-compatible plugin surfaces use `.mcp.json` with a top-level `mcpServers` object:

```json
{
  "mcpServers": {
    "company-example": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp/example",
      "tools": ["*"]
    }
  }
}
```

The repository keeps this shape at `examples/vscode/.mcp.json`. Do not assume the workspace and portable files are byte-for-byte interchangeable; contract tests pin both examples.

VS Code also supports the newer Agent Plugins 1.0 packaging model, where MCP servers are portable plugin components described from a root `mcp.json` alongside `plugin.json` and optional skills. This repository does not package servers as Agent Plugins yet. Treat that as a future distribution adapter, not a reason to leak plugin-specific concepts into `mcp-kit` server code.

## Native VS Code UX first

Server/tool titles and descriptions are user-facing API. Read-only/destructive annotations affect confirmation and tool-selection UX, but they are not authorization controls.

Use VS Code's native MCP surfaces rather than rebuilding equivalent client UI:

- `MCP: List Servers` for lifecycle and output;
- `MCP: Browse Resources` for resources;
- Configure Tools / the tool picker for local chat tool availability;
- the Agent Customizations Tools section for Copilot-harness tool availability;
- `Chat: Manage Tool Approval` and `Chat: Reset Tool Confirmations` for tool approvals.

For the Copilot harness running on Agent Host, tool enablement is profile-wide and persists across sessions. Other harnesses use the Chat Configure Tools picker per request/session. Acceptance testing must record which harness was exercised.

## Tool-budget policy

VS Code currently permits at most 128 directly enabled tools in one chat request. It can mitigate larger catalogs with virtual tools via `github.copilot.chat.virtualTools.threshold`, which groups tools and lets the model activate groups on demand.

Our reference-server contract still keeps a single MCP server at or below 128 tools. This is a deliberate VS Code-first quality guardrail, not a claim that catalogs larger than 128 are technically impossible. Small, coherent capability boundaries reduce model choice pressure and remain preferable even when virtual tools are available.

## Trust and diagnostics

Workspace MCP servers have a client-side trust boundary. Reset trust with `MCP: Reset Trust` when validating first-run behavior. When server capabilities change, clear discovery state with `MCP: Reset Cached Tools`.

For failures, use `MCP: List Servers` and Show Output. A release is not VS Code-compatible merely because protocol calls succeed; failure state and recovery must also be understandable to a user.

## Acceptance

MCP conformance does not by itself prove the VS Code user experience. Release candidates use the reproducible checklist in [`vscode-acceptance.md`](./vscode-acceptance.md).

The checklist starts from clean trust/tool-approval/cache state, records the exact VS Code build and harness, exercises tools/resources/prompts, and verifies actionable diagnostics and recovery.
