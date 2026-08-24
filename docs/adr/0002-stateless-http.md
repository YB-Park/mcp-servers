# ADR 0002: Stateless HTTP first

Status: Accepted

## Decision

Remote Streamable HTTP is the primary transport and server-process session state is not a default framework feature. Each MCP request is served from a fresh server factory through the official SDK handler.

## Rationale

This matches the modern MCP direction and simplifies restart, horizontal scaling, reverse proxies, Docker deployment, and multi-worker operation.

## Consequences

Stateful workflows must use explicit application-level state/handles or a dedicated extension instead of hidden process memory.
