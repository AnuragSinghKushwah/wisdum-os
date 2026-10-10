import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { catalogPermissions } from '@wisdum/domain';
import type { Kernel } from '@wisdum/kernel';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../server.js';
import type { RegisteredRoute } from '../../server.js';
import { ROUTE_PERMISSIONS, createRoutePolicy } from '../route-permissions.js';

/**
 * Every route the API serves without credentials. Adding to this list is a
 * security decision: it must be reviewed, not just made to pass.
 */
const EXPECTED_PUBLIC_ROUTES = [
  'GET /health',
  'GET /healthz',
  'GET /metrics',
  'GET /readyz',
  // Published content is shared by its unguessable id; viewing it counts a view.
  'GET /v1/published/:id',
  'POST /v1/auth/login',
  'POST /v1/auth/reset-password-request',
  'POST /v1/auth/resolve-tenant',
  'POST /v1/onboarding/setup',
];

let app: FastifyInstance;
let kernel: Kernel;
let routes: readonly RegisteredRoute[];

beforeAll(async () => {
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('REDIS_URL', '');
  vi.stubEnv('JWT_SECRET', '');
  vi.stubEnv('EMBEDDING_ENABLED', 'false');
  vi.stubEnv('WISDUM_ENV', 'test');
  ({ app, kernel, routes } = await buildServer());
  await app.ready();
});

afterAll(async () => {
  await kernel.stop();
  await app.close();
  vi.unstubAllEnvs();
});

/** Routes this app registers itself: no HEAD twins, no CORS catch-all, no Swagger UI assets. */
function ownRoutes(): RegisteredRoute[] {
  return routes.filter(
    (route) =>
      route.method !== 'HEAD' &&
      route.method !== 'OPTIONS' &&
      route.url !== '/docs' &&
      !route.url.startsWith('/docs/'),
  );
}

const key = (route: { method: string; url: string }) => `${route.method} ${route.url}`;

describe('route permission policy', () => {
  it('registers a meaningful number of routes (guards against the collector silently breaking)', () => {
    expect(ownRoutes().length).toBeGreaterThan(50);
  });

  it('gives every non-public route a policy', () => {
    const policy = createRoutePolicy();
    const unprotected = ownRoutes()
      .filter((route) => !route.public)
      .filter((route) => policy.requirementsFor(route.method, route.url) === undefined)
      .map(key);
    expect(unprotected).toEqual([]);
  });

  it('has no policy entry for a route that no longer exists', () => {
    const registered = new Set(ownRoutes().map(key));
    const stale = Object.keys(ROUTE_PERMISSIONS).filter((entry) => !registered.has(entry));
    expect(stale).toEqual([]);
  });

  it('does not list a public route in the policy table', () => {
    const contradictory = ownRoutes()
      .filter((route) => route.public)
      .map(key)
      .filter((entry) => entry in ROUTE_PERMISSIONS);
    expect(contradictory).toEqual([]);
  });

  it('serves exactly the expected set of public routes', () => {
    const actual = ownRoutes()
      .filter((route) => route.public)
      .map(key)
      .sort();
    expect(actual).toEqual([...EXPECTED_PUBLIC_ROUTES].sort());
  });

  it('only requires permissions that exist in the catalog', () => {
    const known = new Set<string>(catalogPermissions());
    const unknown = Object.entries(ROUTE_PERMISSIONS).flatMap(([route, requirement]) =>
      (typeof requirement === 'string' ? [requirement] : requirement)
        .filter((permission) => !known.has(permission))
        .map((permission) => `${route} -> ${permission}`),
    );
    expect(unknown).toEqual([]);
  });

  it('keeps the catalog honest: every permission is required by at least one route', () => {
    const required = new Set(
      Object.values(ROUTE_PERMISSIONS).flatMap((requirement) =>
        typeof requirement === 'string' ? [requirement] : requirement,
      ),
    );
    const unused = catalogPermissions().filter((permission) => !required.has(permission));
    expect(unused).toEqual([]);
  });

  it('holds HEAD requests to the policy of GET', () => {
    const policy = createRoutePolicy();
    expect(policy.requirementsFor('HEAD', '/v1/knowledge')).toEqual(
      policy.requirementsFor('GET', '/v1/knowledge'),
    );
  });

  it('refuses to serve a route that is missing from the table', () => {
    expect(createRoutePolicy().requirementsFor('GET', '/v1/not-a-real-route')).toBeUndefined();
  });
});
