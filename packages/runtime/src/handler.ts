import type { IdentityContext, ServerDefinition } from '@mcp-platform/mcp-kit';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createSdkServer } from './sdk-adapter.js';

function identityFromAuthInfo(authInfo: unknown): IdentityContext | undefined {
  if (!authInfo || typeof authInfo !== 'object') {
    return undefined;
  }

  const value = authInfo as Record<string, unknown>;
  const subject = typeof value.subject === 'string'
    ? value.subject
    : typeof value.clientId === 'string'
      ? value.clientId
      : undefined;

  return {
    ...(subject ? { subject } : {}),
    claims: Object.freeze({ ...value }),
  };
}

export function createServerHandler(definition: ServerDefinition) {
  return createMcpHandler(({ authInfo }) => {
    const identity = identityFromAuthInfo(authInfo);
    return createSdkServer(definition, identity ? { identity } : {});
  });
}
