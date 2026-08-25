# mcp-servers

VS Code-first, MCP-standard-compliant framework and runtime for building and operating multiple remote MCP servers from one host.

## Quick start

Requirements: Node.js 24+ and pnpm 11.23.0 (the repository pins pnpm through Corepack).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The host starts on `http://127.0.0.1:3000` by default. Verify it:

```bash
curl http://127.0.0.1:3000/health
```

The reference MCP endpoint is:

```text
http://127.0.0.1:3000/mcp/example
```

Add it to `.vscode/mcp.json`:

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

In VS Code, run `MCP: List Servers`, start/trust `company-example`, then use the `hello` or `add` tool from Agent chat. The example server also exposes one Resource and one Prompt.

See [`docs/guides/vscode.md`](docs/guides/vscode.md) for the portable `.mcp.json` / Agent Host configuration and [`docs/guides/vscode-acceptance.md`](docs/guides/vscode-acceptance.md) for the release acceptance checklist.

## Run as a central host

For another PC to connect, bind the host to a network interface and explicitly allow the hostname or IP that clients use in the URL. Host allowlists are hostname-only; do not include the port.

POSIX shell example:

```bash
MCP_HOST=0.0.0.0 \
MCP_ALLOWED_HOSTS=mcp-server.company.local,10.0.0.25 \
pnpm dev
```

PowerShell example:

```powershell
$env:MCP_HOST = "0.0.0.0"
$env:MCP_ALLOWED_HOSTS = "mcp-server.company.local,10.0.0.25"
pnpm dev
```

Then another PC can register, for example:

```json
{
  "servers": {
    "company-example": {
      "type": "http",
      "url": "http://mcp-server.company.local:3000/mcp/example"
    }
  }
}
```

Non-browser MCP clients such as VS Code Desktop normally omit `Origin`. If a browser-based client is required, set `MCP_ALLOWED_ORIGINS` to the allowed **origin hostnames**. On non-loopback bindings, Origin-bearing requests are rejected by default unless explicitly allowed.

## Docker

Local Docker smoke:

```bash
docker compose up --build
```

For a central Docker host, pass the hostnames/IPs clients will use:

```bash
MCP_ALLOWED_HOSTS=mcp-server.company.local,10.0.0.25 docker compose up --build -d
```

Use `MCP_PUBLISHED_PORT` if port 3000 is unavailable on the Docker host. `MCP_ALLOWED_ORIGINS` is optional and follows the same secure browser-Origin behavior described above.

## Add another MCP server

Create a module under `servers/<id>`, define it through `@mcp-platform/mcp-kit`, and register it explicitly in `apps/host/src/registry.ts`. The stable endpoint becomes `/mcp/<id>`.

Start with [`docs/guides/create-server.md`](docs/guides/create-server.md) and copy patterns from [`servers/example`](servers/example). Server modules should not import `@modelcontextprotocol/*` directly.

## Goals

- Run MCP servers centrally and connect from multiple developer PCs over HTTP.
- Make new MCP modules easy to add without exposing protocol/transport details.
- Keep external change boundaries replaceable: MCP SDK/protocol, auth, capability discovery, registry/distribution, and client adapters.
- Treat MCP developer DX, platform maintainability, and VS Code consumer UX as equal concerns.
- Keep examples, tests, and documentation executable and LLM-friendly.

## Architecture

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

Technology baseline:

- TypeScript
- Node.js 24 LTS target
- pnpm workspace
- Official MCP TypeScript SDK v2 behind a runtime adapter
- stateless HTTP first

The current CI gates build/type contracts, unit/contract/integration tests, real HTTP legacy + modern smoke paths, Docker build, and a blocking MCP `2026-07-28` core conformance suite with no expected-failure baseline.

See [`docs/architecture/overview.md`](docs/architecture/overview.md), [`docs/architecture/testing-strategy.md`](docs/architecture/testing-strategy.md), and [`AGENTS.md`](AGENTS.md).
