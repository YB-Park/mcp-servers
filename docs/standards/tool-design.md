# Tool Design Standard

## Prefer domain actions over transport wrappers

A tool should express what the user/agent wants to accomplish, not expose an internal HTTP endpoint mechanically.

## Keep tools focused

Prefer small deterministic capabilities. If a useful higher-level operation can gather several facts deterministically, a compound/context tool is acceptable, but avoid giant catch-all tools.

## Metadata quality

Every tool should have:

- a stable name; prefer kebab-case or snake_case within one server for human consistency, while the framework preserves the full MCP-legal 1-64 character name space (`A-Z`, `a-z`, `0-9`, `_`, `-`, `.`, `/`)
- concise user-facing title
- description that tells an agent when to use it
- explicit input schema with useful field descriptions
- structured output when callers benefit from machine-readable data
- accurate read-only/destructive/idempotent/open-world hints when relevant

Naming style is a project convention, not a protocol restriction. Do not narrow valid MCP names in framework validation merely to enforce style.

Annotations are UX hints, never authorization policy.

## Failure behavior

Expected business failures should return a useful tool error/result rather than throw opaque exceptions. Unexpected exceptions are runtime errors and must be logged/translated centrally without leaking sensitive internals.
