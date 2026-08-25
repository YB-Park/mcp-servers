# ADR 0003: Official SDK behind an adapter

Status: Accepted

## Decision

Use the official MCP TypeScript SDK v2 for wire/protocol behavior, but prohibit direct SDK imports from `servers/*`. Runtime translates framework definitions into SDK registrations.

## Rationale

The MCP spec and SDK evolve quickly. Centralizing the dependency reduces migration blast radius while preserving standards compliance.

## Escape hatch

A future advanced API may expose controlled raw-SDK access. It must remain optional and must not force normal module authors to understand protocol internals.
