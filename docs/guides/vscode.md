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

## Acceptance checklist

Before calling a release VS Code-compatible, verify in a real VS Code build:

1. add the remote HTTP server;
2. confirm trust/start behavior;
3. inspect tool names, titles, descriptions, schemas, and annotations in the tool picker;
4. verify resources and prompts are visible;
5. invoke representative tools and confirm expected approval UX;
6. stop the host and verify MCP Output/diagnostics are actionable;
7. repeat with portable `.mcp.json` when Agent Host portability is in scope.

MCP conformance does not by itself prove this UX. Keep VS Code acceptance as an explicit release gate.
