import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TestApi } from './test-api.js';
import type { Session } from './test-api.js';

/**
 * Two real tenants on the real server. Tenant A creates one of everything;
 * tenant B, a full owner of its own tenant, must not be able to see, change,
 * or reference any of it. Every refusal must look like "not found / invalid",
 * never a success.
 */
let api: TestApi;
let a: Session;
let b: Session;
const made: Record<string, string> = {};

const REFUSED = [400, 403, 404, 422];

async function createAsA(
  name: string,
  url: string,
  payload: unknown,
  idField: string,
): Promise<void> {
  const response = await api.call('POST', url, { headers: a.headers, payload });
  expect(response.status, `setup ${name}`).toBeLessThan(300);
  made[name] = response.body[idField] as string;
}

beforeAll(async () => {
  api = await TestApi.start();
  a = await api.signInAsDevOwner();
  b = await api.signUpTenant('beta');

  await createAsA(
    'knowledge',
    '/v1/knowledge',
    { title: 'A secret', type: 'note', visibility: 'private', sourceKind: 'manual' },
    'knowledgeId',
  );
  await createAsA(
    'document',
    '/v1/documents',
    { content: 'tenant A confidential', mimeType: 'text/plain', encoding: 'utf-8' },
    'documentId',
  );
  await createAsA('organization', '/v1/organizations', { name: 'Org A' }, 'organizationId');
  await createAsA(
    'workspace',
    '/v1/workspaces',
    { organizationId: made.organization, name: 'WS A' },
    'workspaceId',
  );
  await createAsA(
    'plugin',
    '/v1/plugins',
    { pluginName: 'acme/thing', version: '1.0.0', displayName: 'Thing', description: 'd' },
    'pluginId',
  );
  await createAsA(
    'searchIndex',
    '/v1/search-indexes',
    { name: 'idx-a', mode: 'keyword' },
    'searchIndexId',
  );
  await createAsA(
    'conversation',
    '/v1/conversations',
    { provider: 'anthropic', modelName: 'x' },
    'conversationId',
  );
  await createAsA(
    'opportunity',
    '/v1/opportunities',
    { title: 'Opp A', type: 'blog_post', rationale: 'r' },
    'opportunityId',
  );
  const draft = await api.call('POST', `/v1/opportunities/${made.opportunity}/draft`, {
    headers: a.headers,
    payload: {},
  });
  made.draft = draft.body.draftId as string;
});

afterAll(async () => {
  await api.close();
});

describe('tenant isolation', () => {
  it('lets tenant A reach everything it created (so the refusals below are meaningful)', async () => {
    for (const url of [
      `/v1/knowledge/${made.knowledge}`,
      `/v1/documents/${made.document}`,
      `/v1/organizations/${made.organization}`,
      `/v1/workspaces/${made.workspace}`,
      `/v1/plugins/${made.plugin}`,
      `/v1/search-indexes/${made.searchIndex}`,
      `/v1/conversations/${made.conversation}`,
      `/v1/opportunities/${made.opportunity}`,
      `/v1/drafts/${made.draft}`,
      `/v1/users/${a.userId}`,
    ]) {
      expect((await api.call('GET', url, { headers: a.headers })).status, url).toBe(200);
    }
  });

  describe('reading', () => {
    it.each([
      ['knowledge', () => `/v1/knowledge/${made.knowledge}`],
      ['document', () => `/v1/documents/${made.document}`],
      ['organization', () => `/v1/organizations/${made.organization}`],
      ['workspace', () => `/v1/workspaces/${made.workspace}`],
      ['plugin', () => `/v1/plugins/${made.plugin}`],
      ['search index', () => `/v1/search-indexes/${made.searchIndex}`],
      ['search index query', () => `/v1/search-indexes/${made.searchIndex}/search?text=x`],
      ['conversation', () => `/v1/conversations/${made.conversation}`],
      ['opportunity', () => `/v1/opportunities/${made.opportunity}`],
      ['draft', () => `/v1/drafts/${made.draft}`],
      ['user', () => `/v1/users/${a.userId}`],
    ])("does not let tenant B read A's %s", async (_label, url) => {
      const response = await api.call('GET', url(), { headers: b.headers });
      expect(REFUSED).toContain(response.status);
    });

    it.each([
      '/v1/knowledge',
      '/v1/workspaces',
      '/v1/plugins',
      '/v1/opportunities',
      '/v1/drafts',
      '/v1/agents/tasks',
    ])("shows tenant B none of A's data when listing %s", async (url) => {
      const response = await api.call<unknown[]>('GET', url, { headers: b.headers });
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('does not let a header choose the tenant', async () => {
      const response = await api.call('GET', `/v1/knowledge/${made.knowledge}`, {
        headers: { ...b.headers, 'x-tenant-id': a.tenantId },
      });
      expect(REFUSED).toContain(response.status);
    });
  });

  describe('writing', () => {
    // Conversation turns are covered by assistant-conversation-runtime.test.ts: they need a
    // configured AI provider, which this in-memory server does not have.
    const attempts: [string, string, () => string, () => unknown][] = [
      [
        'update knowledge',
        'PATCH',
        () => `/v1/knowledge/${made.knowledge}`,
        () => ({ title: 'pwned' }),
      ],
      ['delete knowledge', 'DELETE', () => `/v1/knowledge/${made.knowledge}`, () => undefined],
      ['archive knowledge', 'POST', () => `/v1/knowledge/${made.knowledge}/archive`, () => ({})],
      [
        'attach content to knowledge',
        'POST',
        () => `/v1/knowledge/${made.knowledge}/content`,
        () => ({ reference: made.document, mimeType: 'text/plain' }),
      ],
      [
        'change knowledge visibility',
        'POST',
        () => `/v1/knowledge/${made.knowledge}/visibility`,
        () => ({ visibility: 'public' }),
      ],
      [
        'import into knowledge',
        'POST',
        () => `/v1/knowledge/${made.knowledge}/import`,
        () => ({ source: 'x' }),
      ],
      ['publish knowledge', 'POST', () => `/v1/knowledge/${made.knowledge}/publish`, () => ({})],
      [
        'replace document content',
        'PUT',
        () => `/v1/documents/${made.document}/content`,
        () => ({ content: 'pwned', encoding: 'utf-8' }),
      ],
      ['enable plugin', 'POST', () => `/v1/plugins/${made.plugin}/enable`, () => ({})],
      ['disable plugin', 'POST', () => `/v1/plugins/${made.plugin}/disable`, () => ({})],
      [
        'add a member to a workspace',
        'POST',
        () => `/v1/workspaces/${made.workspace}/members`,
        () => ({ userId: b.userId, role: 'owner' }),
      ],
      [
        'change workspace settings',
        'PUT',
        () => `/v1/workspaces/${made.workspace}/settings`,
        () => ({ key: 'k', value: 'v' }),
      ],
      [
        'attach a workspace to an organization',
        'POST',
        () => `/v1/organizations/${made.organization}/workspaces`,
        () => ({ workspaceId: made.workspace }),
      ],
      [
        'index into a search index',
        'POST',
        () => `/v1/search-indexes/${made.searchIndex}/documents`,
        () => ({
          sourceId: '00000000-0000-4000-8000-000000000099',
          sourceType: 'document',
          text: 'pwn',
        }),
      ],
      [
        'append to a conversation',
        'POST',
        () => `/v1/conversations/${made.conversation}/messages`,
        () => ({ role: 'user', content: 'hi' }),
      ],
      [
        'dismiss an opportunity',
        'POST',
        () => `/v1/opportunities/${made.opportunity}/dismiss`,
        () => ({}),
      ],
      [
        'generate a draft from an opportunity',
        'POST',
        () => `/v1/opportunities/${made.opportunity}/draft`,
        () => ({}),
      ],
      [
        'edit a draft',
        'PUT',
        () => `/v1/drafts/${made.draft}`,
        () => ({ title: 'pwned', body: 'pwned' }),
      ],
      ['publish a draft', 'POST', () => `/v1/drafts/${made.draft}/publish`, () => ({})],
      [
        'assign a role to a user',
        'POST',
        () => `/v1/users/${a.userId}/roles`,
        () => ({ roleId: '11111111-1111-4111-8111-111111111111' }),
      ],
    ];

    it.each(attempts)(
      'does not let tenant B %s in tenant A',
      async (_label, method, url, payload) => {
        const response = await api.call(method, url(), { headers: b.headers, payload: payload() });
        expect(REFUSED, `${method} ${url()} -> ${response.status}`).toContain(response.status);
      },
    );

    it("leaves tenant A's data exactly as it was", async () => {
      const knowledge = await api.call('GET', `/v1/knowledge/${made.knowledge}`, {
        headers: a.headers,
      });
      expect(knowledge.body.title).toBe('A secret');
      expect(knowledge.body.status).toBe('draft');

      const document = await api.call('GET', `/v1/documents/${made.document}`, {
        headers: a.headers,
      });
      expect(document.body.content).toBe('tenant A confidential');

      const workspace = await api.call<{ memberCount: number }>(
        'GET',
        `/v1/workspaces/${made.workspace}`,
        { headers: a.headers },
      );
      expect(workspace.body.memberCount).toBe(1);
    });
  });

  describe('references and claimed identities', () => {
    it('does not let a body-supplied tenantId override the credential', async () => {
      await api.call('POST', '/v1/knowledge', {
        headers: b.headers,
        payload: {
          title: 'spoofed',
          type: 'note',
          visibility: 'private',
          sourceKind: 'manual',
          tenantId: a.tenantId,
        },
      });
      const aList = await api.call<{ title: string }[]>('GET', '/v1/knowledge', {
        headers: a.headers,
      });
      expect(aList.body.some((k) => k.title === 'spoofed')).toBe(false);
    });

    it("refuses a workspace under another tenant's organization", async () => {
      const response = await api.call('POST', '/v1/workspaces', {
        headers: b.headers,
        payload: { organizationId: made.organization, name: 'Sneaky' },
      });
      expect(REFUSED).toContain(response.status);
    });

    it("refuses to attach another tenant's workspace to an organization", async () => {
      const org = await api.call('POST', '/v1/organizations', {
        headers: b.headers,
        payload: { name: 'Org B' },
      });
      const response = await api.call(
        'POST',
        `/v1/organizations/${org.body.organizationId}/workspaces`,
        {
          headers: b.headers,
          payload: { workspaceId: made.workspace },
        },
      );
      expect(REFUSED).toContain(response.status);
    });

    it("refuses to add another tenant's user to a workspace", async () => {
      const org = await api.call('POST', '/v1/organizations', {
        headers: b.headers,
        payload: { name: 'Org B2' },
      });
      const ws = await api.call('POST', '/v1/workspaces', {
        headers: b.headers,
        payload: { organizationId: org.body.organizationId, name: 'WS B' },
      });
      const response = await api.call('POST', `/v1/workspaces/${ws.body.workspaceId}/members`, {
        headers: b.headers,
        payload: { userId: a.userId, role: 'member' },
      });
      expect(REFUSED).toContain(response.status);
    });

    it("refuses to reference another tenant's document as content", async () => {
      const knowledge = await api.call('POST', '/v1/knowledge', {
        headers: b.headers,
        payload: { title: 'mine', type: 'note', visibility: 'private', sourceKind: 'manual' },
      });
      const response = await api.call(
        'POST',
        `/v1/knowledge/${knowledge.body.knowledgeId}/content`,
        {
          headers: b.headers,
          payload: { reference: made.document, mimeType: 'text/plain' },
        },
      );
      expect(response.status).toBe(404);
    });

    it('refuses a workspace creator or conversation owner other than the caller', async () => {
      const org = await api.call('POST', '/v1/organizations', {
        headers: a.headers,
        payload: { name: 'Org A2' },
      });
      const forgedWorkspace = await api.call('POST', '/v1/workspaces', {
        headers: a.headers,
        payload: { organizationId: org.body.organizationId, name: 'Forged', createdBy: b.userId },
      });
      expect(forgedWorkspace.status).toBe(403);

      const forgedConversation = await api.call('POST', '/v1/conversations', {
        headers: b.headers,
        payload: { provider: 'anthropic', modelName: 'x', ownerId: a.userId },
      });
      expect(forgedConversation.status).toBe(403);

      const honest = await api.call('POST', '/v1/conversations', {
        headers: b.headers,
        payload: { provider: 'anthropic', modelName: 'x', ownerId: b.userId },
      });
      expect(honest.status).toBe(201);
    });
  });
});
