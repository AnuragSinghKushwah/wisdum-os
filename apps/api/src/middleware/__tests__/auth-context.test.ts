import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  AccessPolicy,
  AuthenticateApiKeyHandler,
  CreateApiKeyHandler,
  createApiKeyCommand,
} from '@wisdum/application';
import { ApiKeyId } from '@wisdum/domain';
import {
  InMemoryApiKeyRepository,
  JwtTokenService,
  Sha256ApiKeyHasher,
} from '@wisdum/infrastructure';
import type { IsoTimestamp, TenantId, UUID } from '@wisdum/types';
import { createAuthHook, requirePrincipal } from '../auth-context.js';
import { errorHandler } from '../error-handler.js';
import { createRoutePolicy } from '../../security/route-permissions.js';
import { requireTenantId } from '../tenant-context.js';

const SECRET = 'a-test-signing-secret-of-sufficient-length';
const TENANT = '11111111-1111-4111-8111-111111111111' as TenantId;
const OTHER_TENANT = '99999999-9999-4999-8999-999999999999';
const USER = '22222222-2222-4222-8222-222222222222' as UUID;

const clock = { now: () => new Date().toISOString() as IsoTimestamp };
const access = new AccessPolicy();

/** A stand-in for the real table: just enough routes to exercise every branch of the policy. */
const routePolicy = createRoutePolicy({
  'GET /private': 'knowledge:read',
  'GET /write': 'knowledge:write',
  'GET /both': ['knowledge:read', 'document:write'],
});

async function buildApp(): Promise<{
  app: FastifyInstance;
  tokens: JwtTokenService;
  issueApiKey: (scopes: string[]) => Promise<{ id: string; key: string }>;
  repository: InMemoryApiKeyRepository;
}> {
  const tokens = new JwtTokenService(SECRET);
  const repository = new InMemoryApiKeyRepository();
  const hasher = new Sha256ApiKeyHasher();
  const apiKeys = new AuthenticateApiKeyHandler(repository, hasher, clock);
  let sequence = 0;
  const issuer = new CreateApiKeyHandler(
    repository,
    hasher,
    { nextId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` as UUID },
    { publishAll: () => Promise.resolve() },
    clock,
  );

  const app = Fastify();
  app.setErrorHandler(errorHandler);
  app.addHook('onRequest', createAuthHook({ tokens, apiKeys, access, routePolicy }));
  app.get('/private', async (request) => {
    const principal = requirePrincipal(request);
    return {
      kind: principal.kind,
      userId: principal.userId,
      tenant: requireTenantId(request),
      scopes: principal.scopes,
    };
  });
  app.get('/write', async () => ({ ok: true }));
  app.get('/both', async () => ({ ok: true }));
  app.get('/unpoliced', async () => ({ ok: true }));
  app.get('/open', { config: { public: true } }, async (request) => ({
    hasPrincipal: request.principal !== undefined,
  }));
  app.get('/docs/json', async () => ({ ok: true }));
  app.get('/docsx', async () => ({ ok: true }));
  await app.ready();

  return {
    app,
    tokens,
    repository,
    issueApiKey: async (scopes) => {
      const result = await issuer.execute(
        createApiKeyCommand({
          tenantId: TENANT,
          ownerId: USER,
          label: 'test',
          scopes,
          grantorPermissions: ['knowledge:*', 'document:*'],
        }),
      );
      return { id: result.apiKeyId, key: result.plaintextKey };
    },
  };
}

describe('authentication hook', () => {
  it('rejects a request with no credentials', async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/private' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('authentication_error');
  });

  it.each(['dev-token', 'dev-session-token', 'mock-jwt-token'])(
    'no longer honours the retired development token %s',
    async (token) => {
      const { app } = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/private',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(401);
    },
  );

  it('authenticates a signed session token and takes the tenant from it, not the header', async () => {
    const { app, tokens } = await buildApp();
    const token = await tokens.issue({
      userId: USER,
      tenantId: TENANT,
      roleIds: [access.systemRoleId(TENANT, 'viewer')],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${token}`, 'x-tenant-id': OTHER_TENANT },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ kind: 'user', userId: USER, tenant: TENANT });
  });

  it('rejects a token signed with a different secret', async () => {
    const { app } = await buildApp();
    const forged = await new JwtTokenService('another-secret-that-is-also-long-enough').issue({
      userId: USER,
      tenantId: TENANT,
      roleIds: ['admin'],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${forged}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects an expired token', async () => {
    const { app } = await buildApp();
    const expired = await new JwtTokenService(SECRET, -60).issue({
      userId: USER,
      tenantId: TENANT,
      roleIds: [],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${expired}` },
    });
    expect(res.statusCode).toBe(401);
  });

  it('authenticates an API key from x-api-key and from a bearer header', async () => {
    const { app, issueApiKey } = await buildApp();
    const { key } = await issueApiKey(['knowledge:read']);

    for (const headers of [{ 'x-api-key': key }, { authorization: `Bearer ${key}` }]) {
      const res = await app.inject({
        method: 'GET',
        url: '/private',
        headers: { ...headers, 'x-tenant-id': OTHER_TENANT },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        kind: 'api-key',
        userId: USER,
        tenant: TENANT,
        scopes: ['knowledge:read'],
      });
    }
  });

  it('rejects a revoked API key and a made-up one', async () => {
    const { app, issueApiKey, repository } = await buildApp();
    const { id, key } = await issueApiKey(['knowledge:read']);
    const found = await repository.findById(ApiKeyId.create(id));
    if (!found.some) {
      throw new Error('issued key was not stored');
    }
    found.value.revoke(clock);
    await repository.save(found.value);

    for (const candidate of [key, 'w_sk_0000000000000000000000000000000000000000000000000']) {
      const res = await app.inject({
        method: 'GET',
        url: '/private',
        headers: { 'x-api-key': candidate },
      });
      expect(res.statusCode).toBe(401);
    }
  });

  it('rejects a request that presents two credentials', async () => {
    const { app, tokens, issueApiKey } = await buildApp();
    const { key } = await issueApiKey(['knowledge:read']);
    const token = await tokens.issue({ userId: USER, tenantId: TENANT, roleIds: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/private',
      headers: { authorization: `Bearer ${token}`, 'x-api-key': key },
    });
    expect(res.statusCode).toBe(401);
  });

  it('serves public routes anonymously and never attaches a principal there', async () => {
    const { app, tokens } = await buildApp();
    const anonymous = await app.inject({ method: 'GET', url: '/open' });
    expect(anonymous.statusCode).toBe(200);
    expect(anonymous.json()).toEqual({ hasPrincipal: false });

    const token = await tokens.issue({ userId: USER, tenantId: TENANT, roleIds: [] });
    const withToken = await app.inject({
      method: 'GET',
      url: '/open',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(withToken.json()).toEqual({ hasPrincipal: false });
  });

  it('does not let a stale credential block a public route', async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/open',
      headers: { authorization: 'Bearer expired.or.garbage' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('leaves unknown paths as 404 rather than 401', async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/no-such-route' });
    expect(res.statusCode).toBe(404);
  });

  it('does not let a /docs-prefixed URL reach a private route', async () => {
    const { app } = await buildApp();
    for (const url of [
      '/docs/../private',
      '/docs/%2e%2e/private',
      '/docs/./../private',
      '/docs/..%2fprivate',
    ]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).not.toBe(200);
    }
  });

  it('treats only /docs and its children as public', async () => {
    const { app } = await buildApp();
    expect((await app.inject({ method: 'GET', url: '/docs/json' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/docsx' })).statusCode).toBe(401);
  });

  it('treats /docsx as private but needs a policy, so an unlisted route is refused after authentication', async () => {
    const { app, tokens } = await buildApp();
    const token = await tokens.issue({
      userId: USER,
      tenantId: TENANT,
      roleIds: [access.systemRoleId(TENANT, 'owner')],
    });
    const res = await app.inject({
      method: 'GET',
      url: '/docsx',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('authorization', () => {
  async function callAs(
    roleNames: ('owner' | 'admin' | 'member' | 'viewer')[],
    url: string,
    tenant = TENANT,
  ) {
    const { app, tokens } = await buildApp();
    const token = await tokens.issue({
      userId: USER,
      tenantId: tenant,
      roleIds: roleNames.map((name) => access.systemRoleId(TENANT, name)),
    });
    return app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  }

  it('lets a role through to what it holds and refuses the rest with 403', async () => {
    expect((await callAs(['viewer'], '/private')).statusCode).toBe(200);
    const denied = await callAs(['viewer'], '/write');
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe('authorization_error');
    expect(denied.json().error.details.required).toEqual(['knowledge:write']);
    expect((await callAs(['member'], '/write')).statusCode).toBe(200);
  });

  it('refuses a user who holds no roles anything at all', async () => {
    expect((await callAs([], '/private')).statusCode).toBe(403);
  });

  it('grants nothing for a role id that belongs to a different tenant', async () => {
    // Token says tenant B, but carries tenant A's owner role id.
    const res = await callAs(['owner'], '/private', OTHER_TENANT as TenantId);
    expect(res.statusCode).toBe(403);
  });

  it('requires every permission when a route lists several', async () => {
    // A viewer holds knowledge:read but not document:write, so one of two is not enough.
    expect((await callAs(['viewer'], '/both')).statusCode).toBe(403);
    expect((await callAs(['member'], '/both')).statusCode).toBe(200);
  });

  it('refuses a route that has no policy, even for an owner', async () => {
    const res = await callAs(['owner'], '/unpoliced');
    expect(res.statusCode).toBe(403);
    expect(res.json().error.message).toContain('no access policy');
  });

  it('holds an API key to its scopes, not to its owner', async () => {
    const { app, issueApiKey } = await buildApp();
    const reader = await issueApiKey(['knowledge:read']);
    expect(
      (await app.inject({ method: 'GET', url: '/private', headers: { 'x-api-key': reader.key } }))
        .statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: 'GET', url: '/write', headers: { 'x-api-key': reader.key } }))
        .statusCode,
    ).toBe(403);

    const wildcard = await issueApiKey(['knowledge:*']);
    expect(
      (await app.inject({ method: 'GET', url: '/write', headers: { 'x-api-key': wildcard.key } }))
        .statusCode,
    ).toBe(200);
  });
});
