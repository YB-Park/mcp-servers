# Architecture Overview

## Mission

Provide a reusable framework and central runtime for teams that want to develop many MCP servers once, host them on an internal machine, and connect from VS Code or other MCP clients over HTTP.

## Principles

1. **VS Code first, not VS Code locked-in.** VS Code is the primary UX target; framework contracts stay MCP/client neutral.
2. **Stateless first.** A request should not depend on server-process session memory by default.
3. **One host, many isolated MCP modules.** Each module has a canonical `/mcp/:serverId` endpoint.
4. **Stable core, replaceable edges.** Protocol/SDK, identity/auth, capability discovery, registry/distribution, and client-specific integration are change boundaries.
5. **Official SDK owns the wire.** The platform never reimplements MCP framing/version negotiation when the SDK can own it.
6. **Manifest is source of truth.** Server identity/metadata should be declared once and reused by runtime, docs, future registry/control-plane adapters, and client integration artifacts.
7. **Docs are API.** Human and coding-agent consumers must be able to extend the system from repository documentation and executable examples.

## Layers

```text
MCP clients / VS Code
        |
client/distribution adapters (future)
        |
HTTP host + routing
        |
runtime contracts
        |
protocol adapter -> official MCP SDK
        |
@mcp-platform/mcp-kit
        |
servers/* business modules
```

Cross-cutting concerns such as authentication, authorization, observability, audit, configuration, and diagnostics must be separate from business tools.

## Capability model

The public API supports tools first while reserving first-class shapes for resources, prompts, instructions, and future extensions. Internally, capability discovery must not assume a permanently immutable tool array. v0.1 uses a static catalog; future implementations may become permission-aware or progressive without forcing business-module rewrites.

## Identity and authorization

Do not model identity as only `userId`. The long-term contract may need subject, actor, claims, and delegation. Authentication answers who/what is calling; authorization answers what that identity may do. The first bootstrap does not implement an IAM system.

## VS Code UX

Use VS Code-native MCP UX wherever available: server configuration, trust, enable/disable, tool selection, prompts/resources, diagnostics, and future registry/distribution surfaces. The future control plane should fill server-side operational gaps rather than rebuild VS Code.

## Explicit non-goals

- agent harness / multi-agent framework
- model-specific behavior
- custom OAuth authorization server
- fork of the MCP SDK
- dynamic plugin marketplace in v0.1
- admin UI in v0.1
- speculative abstraction of business logic
