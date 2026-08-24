# VS Code Setup

Start the host and register the remote MCP endpoint in VS Code.

```json
{
  "servers": {
    "example": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp/example"
    }
  }
}
```

The repository keeps an executable-style example under `examples/vscode/mcp.json`.

## UX expectations

Server/tool titles and descriptions are user-facing API. Read-only/destructive annotations should improve VS Code confirmation and tool-selection UX, but they are not authorization controls.

## Compatibility

MCP specification compliance does not by itself prove VS Code compatibility. The release pipeline will keep explicit VS Code compatibility checks as the platform matures.
