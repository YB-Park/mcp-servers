# Create a Server Module

Use `servers/example` as the reference implementation.

1. Create `servers/<id>` with a workspace `package.json` and TypeScript project.
2. Export one `defineServer(...)` definition from `src/index.ts`.
3. Put canonical metadata in the server manifest: stable `id`, title, version, description, owner/tags when useful.
4. Implement capabilities with `defineTool`, `defineResource`, and `definePrompt` from `@mcp-platform/mcp-kit`.
5. Never import `@modelcontextprotocol/*` from a server module.
6. Add the server to the host registry explicitly. v0.1 favors visible static registration over dynamic plugin loading.
7. Add unit tests for business logic and an integration/smoke test when the module exercises new runtime behavior.

A server ID must be lowercase kebab-case and becomes its endpoint: `database` -> `/mcp/database`.
