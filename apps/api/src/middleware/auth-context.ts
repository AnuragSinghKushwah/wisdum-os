import {
  API_KEY_PREFIX,
  AuthenticationError,
  AuthorizationError,
  authenticateApiKeyQuery,
} from '@wisdum/application';
import type { AccessPolicy, AuthenticateApiKeyHandler, TokenService } from '@wisdum/application';
import { PermissionSet } from '@wisdum/domain';
import type { TenantId } from '@wisdum/types';
import type { FastifyRequest } from 'fastify';
import type { RoutePolicy } from '../security/route-permissions.js';

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
  /** Everything this caller may do: the permissions of their roles, or an API key's scopes. */
  readonly permissions: PermissionSet;
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
  readonly access: AccessPolicy;
  readonly routePolicy: RoutePolicy;
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
  // Judge the route that matched, not the text of the URL: a path such as `/docs/../v1/x`
  // must never be public just because it starts with `/docs`.
  const pattern = request.routeOptions.url ?? '';
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pattern === prefix || pattern.startsWith(`${prefix}/`),
  );
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
      permissions: PermissionSet.of(key.scopes),
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
    permissions: deps.access.permissionsForRoles(payload.tenantId as TenantId, payload.roleIds),
  };
}

/** Refuses the request unless the principal holds everything the route's policy requires. */
function authorize(request: FastifyRequest, principal: AuthPrincipal, policy: RoutePolicy): void {
  const route = request.routeOptions.url ?? request.url;
  const required = policy.requirementsFor(request.method, route);
  if (required === undefined) {
    // Fail closed: an endpoint nobody wrote a policy for is not served.
    throw new AuthorizationError('This endpoint has no access policy', {
      method: request.method,
      route,
    });
  }
  const missing = required.filter((permission) => !principal.permissions.allows(permission));
  if (missing.length > 0) {
    throw new AuthorizationError('You do not have permission to perform this action', {
      required: missing,
    });
  }
}

/**
 * Authenticates and authorizes every request before routing proceeds. A
 * request needs a valid bearer token or API key, and that caller must hold the
 * permissions the route's policy requires, unless the route opts out with
 * `config: { public: true }`. Public routes are never given a principal, so
 * nothing on them can depend on a credential the caller happened to send.
 * Preflight and unmatched requests pass through untouched.
 */
export function createAuthHook(deps: AuthHookDependencies) {
  return async (request: FastifyRequest): Promise<void> => {
    if (request.method === 'OPTIONS' || request.is404 || isPublicRoute(request)) {
      return;
    }
    const principal = await authenticate(request, deps);
    request.principal = principal;
    authorize(request, principal, deps.routePolicy);
  };
}

/** Returns the authenticated principal, which every non-public route is guaranteed to have. */
export function requirePrincipal(request: FastifyRequest): AuthPrincipal {
  if (request.principal === undefined) {
    throw new AuthenticationError('Authentication required');
  }
  return request.principal;
}

/**
 * The user a request acts as. A few payloads let a client name the actor
 * (`createdBy`, `ownerId`); a client may only name itself, so the credential
 * decides, a matching claim is accepted, and any other is refused.
 */
export function actingUserId(request: FastifyRequest, claimed?: string): string {
  const principal = requirePrincipal(request);
  if (claimed !== undefined && claimed !== principal.userId) {
    throw new AuthorizationError('You can only act as yourself', { claimed });
  }
  return principal.userId;
}
