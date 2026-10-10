import { API_KEY_PREFIX, AuthenticationError, authenticateApiKeyQuery } from '@wisdum/application';
import type { AuthenticateApiKeyHandler, TokenService } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { FastifyRequest } from 'fastify';

/** Who is making a request, as established by a verified credential. */
export interface AuthPrincipal {
  /** `user` for a signed session token, `api-key` for a machine credential. */
  readonly kind: 'user' | 'api-key';
  /** The user, or for an API key the user that owns it. */
  readonly userId: string;
  readonly tenantId: TenantId;
  readonly roleIds: readonly string[];
  /** Permissions an API key was minted with; empty for a user session. */
  readonly scopes: readonly string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: AuthPrincipal;
  }
  interface FastifyContextConfig {
    /** Marks a route as reachable without credentials. Routes are private unless they opt in. */
    public?: boolean;
  }
}

export interface AuthHookDependencies {
  readonly tokens: TokenService;
  readonly apiKeys: AuthenticateApiKeyHandler;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;
const API_KEY_HEADER = 'x-api-key';
const PUBLIC_PATH_PREFIXES: readonly string[] = ['/docs'];

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function readBearerToken(request: FastifyRequest): string | undefined {
  const header = headerValue(request, 'authorization');
  return header === undefined ? undefined : BEARER_PATTERN.exec(header)?.[1];
}

function isPublicRoute(request: FastifyRequest): boolean {
  if (request.routeOptions.config.public === true) {
    return true;
  }
  const pathname = request.url.split('?')[0] ?? '';
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function authenticate(
  request: FastifyRequest,
  deps: AuthHookDependencies,
): Promise<AuthPrincipal> {
  const bearer = readBearerToken(request);
  const apiKeyHeader = headerValue(request, API_KEY_HEADER);
  if (bearer !== undefined && apiKeyHeader !== undefined) {
    throw new AuthenticationError('Send one credential: a bearer token or an API key, not both');
  }

  const apiKey = apiKeyHeader ?? (bearer?.startsWith(API_KEY_PREFIX) === true ? bearer : undefined);
  if (apiKey !== undefined) {
    const key = await deps.apiKeys.execute(authenticateApiKeyQuery({ plaintextKey: apiKey }));
    return {
      kind: 'api-key',
      userId: key.ownerId,
      tenantId: key.tenantId as TenantId,
      roleIds: [],
      scopes: key.scopes,
    };
  }

  if (bearer === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  const payload = await deps.tokens.verify(bearer);
  return {
    kind: 'user',
    userId: payload.userId,
    tenantId: payload.tenantId as TenantId,
    roleIds: payload.roleIds,
    scopes: [],
  };
}

/**
 * Authenticates every request before routing proceeds: a request needs a
 * valid bearer token or API key unless its route opts out with
 * `config: { public: true }`. Public routes are never given a principal, so
 * nothing on them can depend on a credential the caller happened to send.
 * Preflight and unmatched requests pass through untouched.
 */
export function createAuthHook(deps: AuthHookDependencies) {
  return async (request: FastifyRequest): Promise<void> => {
    if (request.method === 'OPTIONS' || request.is404 || isPublicRoute(request)) {
      return;
    }
    request.principal = await authenticate(request, deps);
  };
}

/** Returns the authenticated principal, which every non-public route is guaranteed to have. */
export function requirePrincipal(request: FastifyRequest): AuthPrincipal {
  if (request.principal === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  return request.principal;
}
