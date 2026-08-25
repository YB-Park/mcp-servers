# ADR 0001: Platform boundaries

Status: Accepted

## Decision

Treat MCP protocol/SDK, identity/auth, capability discovery, registry/distribution, and client-specific integration as external change boundaries. Keep business server modules simple and dependent only on the public `mcp-kit` contract.

## Consequences

- SDK upgrades should primarily affect runtime/protocol code.
- VS Code changes should affect client/distribution adapters, not server business logic.
- We avoid provider/factory abstractions where no credible change pressure exists.
