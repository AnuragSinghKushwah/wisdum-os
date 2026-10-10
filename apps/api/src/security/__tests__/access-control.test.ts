import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestApi } from './test-api.js';
import type { Session } from './test-api.js';

/**
 * Roles, API keys, and the no-escalation rules, end to end on the real server.
 * The route-by-route policy is checked in route-permissions.test.ts and the
 * hook in auth-context.test.ts; this proves the pieces work together.
 */
let api: TestApi;
let owner: Session;
let other: Session;
let viewer: Session;
let member: Session;
let admin: Session;
let roleIds: Record<string, string>;

const KNOWLEDGE = { title: 'x', type: 'note', visibility: 'private', sourceKind: 'manual' };

beforeAll(async () => {
  api = await TestApi.start();
  owner = await api.signInAsDevOwner();
  other = await api.signUpTenant('beta');
  viewer = await api.createUserWithRole(owner, 'viewer@wisdum.test', 'viewer');
  member = await api.createUserWithRole(owner, 'member@wisdum.test', 'member');
  admin = await api.createUserWithRole(owner, 'admin@wisdum.test', 'admin');
  const roles = await api.call<{ id: string; name: string }[]>('GET', '/v1/identity/roles', {
    headers: owner.headers,
  });
  roleIds = Object.fromEntries(roles.body.map((role) => [role.name, role.id]));
});

afterAll(async () => {
  await api.close();
});

describe('roles', () => {
  it('lets the first user of a tenant run it, as owner', async () => {
    expect(
      (await api.call('GET', '/v1/identity/api-keys', { headers: owner.headers })).status,
    ).toBe(200);
    expect(
      (await api.call('POST', '/v1/knowledge', { headers: owner.headers, payload: KNOWLEDGE }))
        .status,
    ).toBe(201);
  });

  it('gives a user with no role nothing, even though they can sign in', async () => {
    const nobody = await api.createUserWithRole(owner, 'nobody@wisdum.test', null);
    expect((await api.call('GET', '/v1/knowledge', { headers: nobody.headers })).status).toBe(403);
  });

  it('lets a viewer read but not write or administer', async () => {
    expect((await api.call('GET', '/v1/knowledge', { headers: viewer.headers })).status).toBe(200);
    const write = await api.call<{ error: { details: { required: string[] } } }>(
      'POST',
      '/v1/knowledge',
      {
        headers: viewer.headers,
        payload: KNOWLEDGE,
      },
    );
    expect(write.status).toBe(403);
    expect(write.body.error.details.required).toEqual(['knowledge:write']);
    expect(
      (await api.call('GET', '/v1/identity/api-keys', { headers: viewer.headers })).status,
    ).toBe(403);
    expect(
      (await api.call('GET', `/v1/users/${owner.userId}`, { headers: viewer.headers })).status,
    ).toBe(403);
  });

  it('lets a member contribute but not delete, publish, or assign roles', async () => {
    const created = await api.call('POST', '/v1/knowledge', {
      headers: member.headers,
      payload: KNOWLEDGE,
    });
    expect(created.status).toBe(201);
    const id = created.body.knowledgeId;
    expect(
      (await api.call('DELETE', `/v1/knowledge/${id}`, { headers: member.headers })).status,
    ).toBe(403);
    expect(
      (
        await api.call('POST', `/v1/knowledge/${id}/publish`, {
          headers: member.headers,
          payload: {},
        })
      ).status,
    ).toBe(403);
    const assign = await api.call('POST', `/v1/users/${viewer.userId}/roles`, {
      headers: member.headers,
      payload: { roleId: roleIds.viewer },
    });
    expect(assign.status).toBe(403);
  });

  it('lets an admin manage users but not become an owner or touch the organization', async () => {
    expect(
      (await api.call('GET', `/v1/users/${viewer.userId}`, { headers: admin.headers })).status,
    ).toBe(200);

    const promote = await api.call('POST', `/v1/users/${admin.userId}/roles`, {
      headers: admin.headers,
      payload: { roleId: roleIds.owner },
    });
    expect(promote.status).toBe(403);

    const org = await api.call('POST', '/v1/organizations', {
      headers: admin.headers,
      payload: { name: 'X' },
    });
    expect(org.status).toBe(403);
  });

  it('lets an owner assign any role', async () => {
    const candidate = await api.createUserWithRole(owner, 'promoted@wisdum.test', null);
    const response = await api.call('POST', `/v1/users/${candidate.userId}/roles`, {
      headers: owner.headers,
      payload: { roleId: roleIds.admin },
    });
    expect(response.status).toBe(200);
  });

  it("rejects a role id that is not one of the tenant's own", async () => {
    const otherRoles = await api.call<{ id: string; name: string }[]>('GET', '/v1/identity/roles', {
      headers: other.headers,
    });
    const foreignOwner = otherRoles.body.find((role) => role.name === 'owner')?.id;
    expect(foreignOwner).toBeDefined();
    expect(foreignOwner).not.toBe(roleIds.owner);

    for (const roleId of [foreignOwner, '11111111-1111-4111-8111-111111111111']) {
      const response = await api.call('POST', `/v1/users/${viewer.userId}/roles`, {
        headers: owner.headers,
        payload: { roleId },
      });
      expect(response.status).toBe(400);
    }
  });
});

describe('API keys', () => {
  async function mint(as: Session, scopes: string[]) {
    return api.call<{ plaintextKey: string; apiKeyId: string }>('POST', '/v1/identity/api-keys', {
      headers: as.headers,
      payload: { label: 'test', scopes },
    });
  }

  it('authenticate real requests and carry only their scopes', async () => {
    const ingest = (await mint(owner, ['capture:ingest'])).body.plaintextKey;
    const body = { source: 'manual', title: 'From a key', content: 'hello' };

    expect(
      (
        await api.call('POST', '/v1/webhooks/ingest', {
          headers: { 'x-api-key': ingest },
          payload: body,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await api.call('POST', '/v1/webhooks/ingest', {
          headers: { authorization: `Bearer ${ingest}` },
          payload: { ...body, content: 'again' },
        })
      ).status,
    ).toBe(201);
    // ...but a key that can only ingest cannot read, or mint further keys.
    expect(
      (await api.call('GET', '/v1/knowledge', { headers: { 'x-api-key': ingest } })).status,
    ).toBe(403);
    expect((await mintWith(ingest, ['capture:ingest'])).status).toBe(403);
  });

  async function mintWith(key: string, scopes: string[]) {
    return api.call('POST', '/v1/identity/api-keys', {
      headers: { 'x-api-key': key },
      payload: { label: 'x', scopes },
    });
  }

  it("write into the key's own tenant, whatever header is sent", async () => {
    const { plaintextKey } = (await mint(owner, ['capture:ingest'])).body;
    await api.call('POST', '/v1/webhooks/ingest', {
      headers: { 'x-api-key': plaintextKey, 'x-tenant-id': other.tenantId },
      payload: { source: 'manual', title: 'Redirected?', content: 'tenant spoof attempt' },
    });
    const theirs = await api.call<{ title: string }[]>('GET', '/v1/knowledge', {
      headers: other.headers,
    });
    expect(theirs.body.some((k) => k.title === 'Redirected?')).toBe(false);
    const ours = await api.call<{ title: string }[]>('GET', '/v1/knowledge', {
      headers: owner.headers,
    });
    expect(ours.body.some((k) => k.title === 'Redirected?')).toBe(true);
  });

  it('are refused once revoked, and a forged key never works', async () => {
    const { plaintextKey, apiKeyId } = (await mint(owner, ['knowledge:read'])).body;
    expect(
      (await api.call('GET', '/v1/knowledge', { headers: { 'x-api-key': plaintextKey } })).status,
    ).toBe(200);

    expect(
      (await api.call('DELETE', `/v1/identity/api-keys/${apiKeyId}`, { headers: owner.headers }))
        .status,
    ).toBe(204);
    expect(
      (await api.call('GET', '/v1/knowledge', { headers: { 'x-api-key': plaintextKey } })).status,
    ).toBe(401);
    expect(
      (await api.call('GET', '/v1/knowledge', { headers: { 'x-api-key': 'w_sk_deadbeef' } }))
        .status,
    ).toBe(401);
  });

  it('cannot be minted with more than the creator holds, or with no scope at all', async () => {
    expect((await mint(admin, ['organization:write'])).status).toBe(403);
    expect((await mint(admin, ['knowledge:read'])).status).toBe(201);
    expect((await mint(owner, [])).status).toBe(400);
    expect((await mint(owner, ['not a permission'])).status).toBe(400);
  });

  it('never reveal the secret when listed', async () => {
    const { plaintextKey } = (await mint(owner, ['knowledge:read'])).body;
    const listed = await api.call<{ scopes: string[] }[]>('GET', '/v1/identity/api-keys', {
      headers: owner.headers,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.length).toBeGreaterThan(0);
    expect(JSON.stringify(listed.body)).not.toContain(plaintextKey);
    expect(listed.body.every((key) => key.scopes.length > 0)).toBe(true);
  });
});

describe('onboarding and sign-in', () => {
  it('keeps public routes public and everything else private', async () => {
    expect((await api.call('GET', '/health')).status).toBe(200);
    expect(
      (await api.call('GET', '/v1/knowledge', { headers: { 'x-tenant-id': owner.tenantId } }))
        .status,
    ).toBe(401);
    for (const token of ['dev-token', 'dev-session-token', 'mock-jwt-token']) {
      expect(
        (await api.call('GET', '/v1/knowledge', { headers: { authorization: `Bearer ${token}` } }))
          .status,
      ).toBe(401);
    }
  });

  it('rejects a wrong password and does not reveal whether the email exists', async () => {
    const wrong = await api.call('POST', '/v1/auth/login', {
      headers: { 'x-tenant-id': owner.tenantId },
      payload: { email: 'dev@wisdum.local', password: 'not-the-password' },
    });
    const unknown = await api.call('POST', '/v1/auth/login', {
      headers: { 'x-tenant-id': owner.tenantId },
      payload: { email: 'nobody-here@wisdum.local', password: 'whatever-it-is' },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('validates sign-up input', async () => {
    const bad = await api.call('POST', '/v1/onboarding/setup', {
      payload: {
        orgName: 'X',
        orgSlug: 'Not A Slug',
        displayName: 'X',
        email: 'x@x.test',
        password: 'short',
      },
    });
    expect(bad.status).toBe(400);
  });
});
