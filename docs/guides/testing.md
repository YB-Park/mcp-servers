# Testing Guide

After installing dependencies:

```bash
pnpm build
pnpm test:unit
pnpm test:integration
pnpm test:smoke
```

Run `pnpm check` before merging framework/runtime changes.

- Unit tests: pure framework and module logic.
- Integration tests: official MCP client against the web-standard runtime handler in-process.
- Smoke tests: actual Node HTTP listener and routing.

When adding a company-only integration, keep network/credential tests optional locally and document the required environment variables. Do not weaken the portable core test suite to accommodate unavailable internal systems.
