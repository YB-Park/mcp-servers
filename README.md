# mcp-servers

VS Code-first, MCP-standard-compliant framework and runtime for building and operating multiple remote MCP servers from one host.

## Goals

- Run MCP servers centrally and connect from multiple developer PCs over HTTP.
- Make new MCP modules easy to add without exposing protocol/transport details.
- Keep external change boundaries replaceable: MCP SDK/protocol, auth, capability discovery, registry/distribution, and client adapters.
- Treat MCP developer DX, platform maintainability, and VS Code consumer UX as equal concerns.
- Keep examples, tests, and documentation executable and LLM-friendly.

## Status

Initial framework bootstrap is under active development. The first milestone proves the architecture with a reference `example` MCP server and layered tests.

## Target shape

```text
VS Code / MCP clients
        |
        | Streamable HTTP
        v
  MCP Host Runtime
   /mcp/example
   /mcp/database
   /mcp/...
        |
        v
MCP server modules
```

Canonical endpoint: `/mcp/:serverId`.

## Technology baseline

- TypeScript
- Node.js 24 LTS target
- pnpm workspace
- Official MCP TypeScript SDK v2 behind a runtime adapter
- Stateless HTTP first

See [`docs/architecture/overview.md`](docs/architecture/overview.md) and [`AGENTS.md`](AGENTS.md).
