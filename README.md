# mcp-servers

VS Code-first, MCP-standard-compliant framework and runtime for building and operating multiple remote MCP servers from one host.

## Quick start: local development

Requirements: Node.js 24+ and pnpm 11.23.0 (the repository pins pnpm through Corepack).

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Loopback development defaults to no authentication. Verify the host:

```bash
curl http://127.0.0.1:3000/health
```

The reference MCP endpoint is `http://127.0.0.1:3000/mcp/example`.

## Central intranet host with managed API keys

Non-loopback hosting defaults to **managed API-key authentication**. Bind the server and explicitly allow the hostname/IP that clients use:

```bash
MCP_HOST=0.0.0.0 \
MCP_ALLOWED_HOSTS=mcp-server.company.local,10.0.0.25 \
pnpm dev
```

PowerShell:

```powershell
$env:MCP_HOST = "0.0.0.0"
$env:MCP_ALLOWED_HOSTS = "mcp-server.company.local,10.0.0.25"
pnpm dev
```

The default credential store is `.data/auth-keys.json`. It stores key metadata and SHA-256 hashes only; plaintext API keys are displayed only when created or rotated.

### Create a key

```bash
pnpm auth:key -- create \
  --label "Park workstation" \
  --subject park \
  --servers example \
  --expires-in-days 90
```

Copy the printed `mcpk_...` value now; it cannot be recovered later from the store.

### Configure VS Code

Use `.vscode/mcp.json` without hardcoding the secret:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "company-mcp-key",
      "description": "Company MCP API key",
      "password": true
    }
  ],
  "servers": {
    "company-example": {
      "type": "http",
      "url": "http://mcp-server.company.local:3000/mcp/example",
      "headers": {
        "Authorization": "Bearer ${input:company-mcp-key}"
      }
    }
  }
}
```

VS Code prompts for the key on first use and stores the sensitive input securely. Run `MCP: List Servers`, start/trust `company-example`, then use the `hello` or `add` tool from Agent chat.

### List, rotate, and revoke keys

```bash
pnpm auth:key -- list
pnpm auth:key -- rotate <key-id> --grace-minutes 60
pnpm auth:key -- revoke <key-id>
```

A rotation with a grace window leaves the previous credential valid only until the shortened expiry, giving multiple PCs time to update their stored VS Code credential. With no grace period, the previous key is revoked immediately.

Keys may be restricted to specific MCP modules with `--servers example,database`. Every normal key also needs the `mcp` scope; it is added by default.

See [`docs/guides/authentication.md`](docs/guides/authentication.md) for the lifecycle and security model and [`docs/guides/vscode.md`](docs/guides/vscode.md) for VS Code/Agent Host configuration details.

## Docker

Start the central host with a persistent managed-key volume:

```bash
MCP_ALLOWED_HOSTS=mcp-server.company.local,10.0.0.25 docker compose up --build -d
```

Create a credential inside the running container:

```bash
docker compose exec mcp-host node apps/host/dist/auth-cli.js create \
  --label "Park workstation" \
  --subject park \
  --servers example \
  --expires-in-days 90
```

`mcp-auth-data` persists `/data/auth-keys.json` across container recreation. The runtime container runs as the non-root `node` user. Use `MCP_PUBLISHED_PORT` if port 3000 is unavailable.

## Security baseline

- Central/non-loopback hosts require authentication by default.
- `MCP_ALLOWED_HOSTS` and `MCP_ALLOWED_ORIGINS` are DNS-rebinding/request-origin defenses; they are not authentication.
- `/health` is intentionally unauthenticated but returns only `{ "status": "ok" }`.
- Plaintext API keys are never stored server-side and raw credentials never reach Tool/Resource/Prompt business code.
- Key administration is a local/server admin CLI, **not an MCP tool** on the normal data plane.
- `MCP_AUTH_MODE=none` on a non-loopback host is refused unless the diagnostics-only `MCP_ALLOW_INSECURE_NO_AUTH=true` override is also supplied.
- Bearer credentials sent over plain HTTP can be reused if traffic is intercepted. A trusted isolated intranet may be acceptable for initial testing, but use TLS/reverse-proxy protection before crossing an untrusted network or according to company security policy.
- This managed API-key scheme is intentionally not presented as MCP OAuth. Future corporate IdP/OAuth/EMA integration belongs behind the authentication boundary without changing MCP business modules.

Non-browser MCP clients such as VS Code Desktop normally omit `Origin`. Browser Origin-bearing requests to non-loopback hosts are rejected unless `MCP_ALLOWED_ORIGINS` explicitly permits the hostname.

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
        | Streamable HTTP + managed auth
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

The CI gates build/type contracts, managed-auth lifecycle and real HTTP enforcement, unit/contract/integration tests, legacy + modern smoke paths, Docker build, and blocking MCP `2026-07-28` core conformance.

See [`docs/architecture/overview.md`](docs/architecture/overview.md), [`docs/architecture/testing-strategy.md`](docs/architecture/testing-strategy.md), [`docs/guides/vscode-acceptance.md`](docs/guides/vscode-acceptance.md), and [`AGENTS.md`](AGENTS.md).
