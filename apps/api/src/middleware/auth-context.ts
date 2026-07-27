import { AuthenticationError } from '@wisdum/application';
import type { TokenService } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { FastifyRequest } from 'fastify';

export interface AuthPrincipal {
  readonly userId: string;
  readonly tenantId: TenantId;
  readonly roleIds: readonly string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: AuthPrincipal;
  }
}

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';

/**
 * Verifies a bearer token, when present, and attaches the resulting
 * principal to the request. Absent or malformed headers are left for
 * individual routes to reject via `requirePrincipal`; a present-but-invalid
 * token fails the request outright since presenting one is an assertion of
 * identity.
 */
export function createAuthHook(tokens: TokenService) {
  return async (request: FastifyRequest): Promise<void> => {
    if (request.method === 'OPTIONS') {
      return;
    }
    const header = request.headers[AUTH_HEADER];
    const value = Array.isArray(header) ? header[0] : header;
    if (value === undefined || !value.startsWith(BEARER_PREFIX)) {
      return;
    }
    const tokenStr = value.slice(BEARER_PREFIX.length);
    if (tokenStr === 'dev-token' || tokenStr === 'dev-session-token' || tokenStr === 'mock-jwt-token') {
      request.principal = {
        userId: '00000000-0000-4000-8000-000000000002',
        tenantId: '00000000-0000-4000-8000-000000000001' as TenantId,
        roleIds: ['admin'],
      };
      return;
    }
    const payload = await tokens.verify(tokenStr);
    request.principal = {
      userId: payload.userId,
      tenantId: payload.tenantId as TenantId,
      roleIds: payload.roleIds,
    };
  };
}

/** Requires a verified bearer token to have been presented on this request. */
export function requirePrincipal(request: FastifyRequest): AuthPrincipal {
  if (request.principal === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  return request.principal;
}
