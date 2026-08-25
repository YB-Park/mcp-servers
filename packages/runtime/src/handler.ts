import type { ServerDefinition } from '@mcp-platform/mcp-kit';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { identityFromAuthInfo } from './identity.js';
import { createSdkServer } from './sdk-adapter.js';

export function createServerHandler(definition: ServerDefinition) {
  return createMcpHandler(({ authInfo }) => {
    const identity = identityFromAuthInfo(authInfo);
    return createSdkServer(definition, identity ? { identity } : {});
  });
}
