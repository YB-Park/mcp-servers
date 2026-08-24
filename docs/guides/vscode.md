# VS Code Setup

The platform is VS Code-first, but VS Code currently has two relevant MCP configuration surfaces. Keep them distinct because their top-level JSON keys differ.

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

## Portable Agent Host / Copilot configuration

For a configuration that can be read natively by Agent Host and other current Copilot surfaces, use workspace `.mcp.json` (or the corresponding user Copilot configuration) with `mcpServers`:

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

The repository keeps this example at `examples/vscode/.mcp.json`.

Do not assume the two files are byte-for-byte interchangeable. Contract tests pin both examples so a documentation change cannot silently break one client surface.

## UX expectations

Server/tool titles and descriptions are user-facing API. Read-only/destructive annotations should improve VS Code confirmation and tool-selection UX, but they are not authorization controls.

VS Code exposes MCP tools, resources, prompts, and apps through its native UI. Prefer those native surfaces over rebuilding equivalent client UI in the platform.

A chat request can currently enable at most 128 tools. The contract suite therefore rejects a single reference server that exceeds that limit; multi-server pressure is a separate catalog/design concern.

## Acceptance

MCP conformance does not by itself prove the VS Code user experience. Release candidates use the reproducible checklist in [`vscode-acceptance.md`](./vscode-acceptance.md).

The checklist deliberately starts by resetting trust and cached tools, records the exact VS Code version/commit/configuration surface, exercises tools/resources/prompts, and verifies that MCP Output is actionable when the host is unavailable.
