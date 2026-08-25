import type { IdentityContext } from '@mcp-platform/mcp-kit';

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    return undefined;
  }
  return [...value];
}

/**
 * Translate SDK authentication metadata into the framework identity contract.
 *
 * Credentials are deliberately not propagated. In particular, AuthInfo.token
 * and arbitrary AuthInfo.extra values must never become tool-visible claims.
 * Provider-specific identity enrichment belongs in the future auth adapter,
 * not in business-tool execution context.
 */
export function identityFromAuthInfo(authInfo: unknown): IdentityContext | undefined {
  const value = record(authInfo);
  if (!value) return undefined;

  const extra = record(value.extra);
  const clientId = typeof value.clientId === 'string' ? value.clientId : undefined;
  const extraSubject = typeof extra?.sub === 'string'
    ? extra.sub
    : typeof extra?.subject === 'string'
      ? extra.subject
      : undefined;
  const subject = extraSubject ?? clientId;
  const scopes = stringArray(value.scopes);
  const expiresAt = typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt)
    ? value.expiresAt
    : undefined;
  const resource = value.resource instanceof URL
    ? value.resource.href
    : typeof value.resource === 'string'
      ? value.resource
      : undefined;

  const claims = Object.freeze({
    ...(clientId ? { clientId } : {}),
    ...(scopes ? { scopes: Object.freeze(scopes) } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(resource ? { resource } : {}),
  });

  return {
    ...(subject ? { subject } : {}),
    ...(clientId && subject && clientId !== subject ? { actor: clientId } : {}),
    claims,
  };
}
