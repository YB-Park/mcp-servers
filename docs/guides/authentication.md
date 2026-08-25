# Managed API-Key Authentication

This is the v0.1 authentication model for a central intranet MCP host. It provides practical access control and key lifecycle management without pretending to be OAuth, SSO, or a corporate IAM system.

## Defaults

- loopback host (`127.0.0.1`, `localhost`, `::1`): authentication defaults to `none` for local development;
- non-loopback host (`0.0.0.0`, LAN address): authentication defaults to `api-key`;
- `/mcp/:serverId`: authenticated when API-key mode is active;
- `/health`: unauthenticated and returns only `{ "status": "ok" }`;
- non-loopback `none` mode is refused unless `MCP_ALLOW_INSECURE_NO_AUTH=true` is explicitly set.

Environment variables:

```text
MCP_AUTH_MODE=none|api-key
MCP_AUTH_STORE=.data/auth-keys.json
MCP_ALLOW_INSECURE_NO_AUTH=false
```

## Key format and storage

Issued credentials look like:

```text
mcpk_<key-id>_<256-bit-random-secret>
```

The plaintext token is displayed only when a key is created or rotated. The server-side store keeps only:

- key id and label;
- optional subject;
- scopes;
- optional allowed MCP server ids;
- create/expire/revoke/rotation metadata;
- SHA-256 hash of the full high-entropy token.

Because the secret contains 256 bits of cryptographic randomness, the stored hash is not intended to be reversible or usable to recover the token. Treat the store itself as sensitive credential metadata anyway.

The default local store is:

```text
.data/auth-keys.json
```

It is gitignored. The Docker deployment uses `/data/auth-keys.json` on the persistent `mcp-auth-data` volume.

## Create a key

```bash
pnpm auth:key -- create \
  --label "Park workstation" \
  --subject park \
  --servers example,database \
  --expires-in-days 90
```

Useful options:

```text
--label             required human-readable owner/device label
--subject           optional identity label exposed as sanitized ExecutionContext identity
--servers           optional comma-separated MCP server ids; omitted means all registered servers
--scopes            optional comma-separated scopes; defaults to mcp
--expires-in-days   optional credential lifetime
```

Copy the printed token immediately into the client credential store. It cannot be listed or recovered later.

`subject` is an operator assertion bound to this key, not proof from corporate SSO. Do not treat it as a stronger identity guarantee than the API key itself.

## List keys

```bash
pnpm auth:key -- list
```

The list contains metadata and status, never plaintext secrets or token hashes.

Typical labels should identify the user/device or workload clearly, for example:

```text
Park / DEV-LAPTOP-01
CI / internal-integration-runner
DB support / workstation-17
```

Avoid anonymous labels such as `key1` because revocation becomes difficult later.

## Rotate a key

Immediate cut-over:

```bash
pnpm auth:key -- rotate <key-id>
```

Graceful cut-over for several client PCs:

```bash
pnpm auth:key -- rotate <key-id> --grace-minutes 60
```

The new token is printed once. With a grace period, the old credential remains valid only until the shortened grace expiry; without a grace period it is revoked immediately.

Rotation preserves the previous key's subject, scopes, server allowlist, and configured expiration. If a credential has already expired, rotation is rejected instead of reviving it; create a new key and revoke/retire the old record.

Recommended operational flow:

1. rotate with a short grace window;
2. update VS Code/clients with the new token;
3. verify connectivity with the new token;
4. let the grace window expire, or revoke the old id immediately once all clients are migrated.

## Revoke a key

```bash
pnpm auth:key -- revoke <key-id>
```

Revocation takes effect on the next request because credentials are verified against the store for every MCP HTTP request.

Revoke immediately when a device is lost, a token is accidentally exposed, or a user/workload no longer needs access.

## Server and scope restrictions

A key created with:

```bash
--servers database,erp
```

is accepted only on:

```text
/mcp/database
/mcp/erp
```

and receives `403` on other MCP modules.

The Host currently requires the `mcp` scope. Additional scope strings can be carried into sanitized identity metadata for future deterministic authorization, but v0.1 does not claim general Tool-level RBAC merely because a custom scope exists.

## VS Code

Use a password input instead of writing a token into the repository:

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

For the portable `.mcp.json` / Agent Host surface, use the repository example that reads `${env:MCP_API_KEY}` rather than hardcoding a credential. See [`vscode.md`](./vscode.md).

## Docker administration

The runtime stores credentials on the persistent `/data` volume. Run the same admin CLI inside the host container:

```bash
docker compose exec mcp-host node apps/host/dist/auth-cli.js create \
  --label "Park workstation" \
  --subject park \
  --servers example \
  --expires-in-days 90
```

Use `list`, `rotate`, and `revoke` the same way.

## Security boundaries

Managed API keys are an intentionally small authentication mechanism for internal hosting.

They provide:

- high-entropy bearer credentials;
- server-side hash-only storage;
- expiry and revocation;
- rotation with grace windows;
- MCP-server allowlists;
- sanitized identity propagation without exposing the raw credential to Tool/Resource/Prompt code.

They do **not** provide:

- corporate SSO or proof of a human identity;
- OAuth authorization flows;
- automatic employee lifecycle synchronization;
- general Tool-level RBAC policy management;
- TLS or protection against network interception;
- a distributed credential database for independent host replicas.

Bearer tokens sent over plain HTTP are reusable by anyone who intercepts them. Initial testing on a trusted isolated intranet can use HTTP when company policy permits, but put TLS/reverse-proxy protection in front of the host before using an untrusted network.

## Scaling beyond one host

`FileApiKeyStore` is a v0.1 single-host/single-persistent-volume implementation. Do not copy separate credential files to multiple replicas and assume revocation/rotation will stay consistent.

The Host depends on a verifier boundary rather than on file format details. When horizontal scaling or corporate identity integration is needed, replace the file-backed verifier with a shared database, approved secret/credential service, Entra/SSO adapter, or other company-managed identity provider while keeping MCP server business modules unchanged.

## Admin-plane rule

Credential administration is deliberately **not exposed as a normal MCP Tool**. A data-plane API key must not grant the ability to mint or revoke credentials.

The local CLI is the v0.1 admin surface. A future Control Plane may call the same credential-management boundary, but it must have a separate administrative trust boundary.
