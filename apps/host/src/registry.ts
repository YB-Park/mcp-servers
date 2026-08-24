import { exampleServer } from '@mcp-server/example';

// v0.1 intentionally uses explicit static registration. Dynamic plugin loading
// is deferred until real operational pressure justifies the complexity.
export const serverDefinitions = [exampleServer] as const;
