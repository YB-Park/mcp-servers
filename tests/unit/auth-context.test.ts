import { describe, expect, it } from 'vitest';
import { identityFromAuthInfo } from '../../packages/runtime/src/identity.js';

describe('runtime auth identity boundary', () => {
  it('never exposes access tokens or arbitrary auth extra data to tools', () => {
    const identity = identityFromAuthInfo({
      token: 'secret-access-token',
      clientId: 'vscode-client',
      scopes: ['mcp:read', 'mcp:write'],
      expiresAt: 1_800_000_000,
      resource: new URL('https://mcp.internal.example'),
      extra: {
        sub: 'employee-123',
        secret: 'provider-private-value',
        groups: ['engineering'],
      },
    });

    expect(identity).toEqual({
      subject: 'employee-123',
      actor: 'vscode-client',
      claims: {
        clientId: 'vscode-client',
        scopes: ['mcp:read', 'mcp:write'],
        expiresAt: 1_800_000_000,
        resource: 'https://mcp.internal.example/',
      },
    });
    expect(identity?.claims).not.toHaveProperty('token');
    expect(identity?.claims).not.toHaveProperty('extra');
    expect(JSON.stringify(identity)).not.toContain('secret-access-token');
    expect(JSON.stringify(identity)).not.toContain('provider-private-value');
  });

  it('falls back to the OAuth client id when no user subject is available', () => {
    expect(identityFromAuthInfo({
      token: 'secret',
      clientId: 'service-client',
      scopes: [],
    })).toEqual({
      subject: 'service-client',
      claims: {
        clientId: 'service-client',
        scopes: [],
      },
    });
  });

  it('returns undefined for unauthenticated requests', () => {
    expect(identityFromAuthInfo(undefined)).toBeUndefined();
  });
});
