import { afterEach, describe, expect, it } from 'vitest';
import { ScriptedProvider, live } from './scripted-provider.js';
import type { Session } from './test-api.js';
import { TestApi } from './test-api.js';

const SOURCE_TEXT =
  'Retrying without backoff turns a small outage into a large one. A client that retries every second hammers a ' +
  'struggling service. Exponential backoff with jitter spreads the load, and giving up loudly after a few attempts ' +
  'beats retrying forever.';

interface GenerateResponse {
  readonly results: readonly {
    readonly platform: string;
    readonly opportunityId: string;
    readonly draftId?: string;
    readonly error?: string;
  }[];
}

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

async function createAsset(api: TestApi, session: Session, text: string): Promise<string> {
  const knowledge = await api.call<{ knowledgeId: string }>('POST', '/v1/knowledge', {
    headers: session.headers,
    payload: {
      title: 'Retries without backoff',
      type: 'note',
      visibility: 'private',
      sourceKind: 'manual',
    },
  });
  const document = await api.call<{ documentId: string }>('POST', '/v1/documents', {
    headers: session.headers,
    payload: { content: text, mimeType: 'text/plain', encoding: 'utf-8' },
  });
  const attached = await api.call('POST', `/v1/knowledge/${knowledge.body.knowledgeId}/content`, {
    headers: session.headers,
    payload: { reference: document.body.documentId, mimeType: 'text/plain' },
  });
  expect(attached.status).toBe(200);
  return knowledge.body.knowledgeId;
}

describe('POST /v1/knowledge/:id/generate', () => {
  it('writes one draft per platform from the source text, and the drafts are reachable', async () => {
    const provider = new ScriptedProvider();
    api = await TestApi.start(live(provider));
    const owner = await api.signInAsDevOwner();
    const knowledgeId = await createAsset(api, owner, SOURCE_TEXT);

    const generated = await api.call<GenerateResponse>(
      'POST',
      `/v1/knowledge/${knowledgeId}/generate`,
      {
        headers: owner.headers,
        payload: {
          platforms: ['linkedin_post', 'x_thread'],
          instructions: 'Aim at engineering leads',
        },
      },
    );

    expect(generated.status).toBe(200);
    expect(generated.body.results.map((r) => r.platform)).toEqual(['linkedin_post', 'x_thread']);
    expect(generated.body.results.every((r) => r.draftId !== undefined)).toBe(true);

    expect(provider.requests).toHaveLength(2);
    for (const request of provider.requests) {
      const prompt = request.messages.map((m) => m.content).join('\n');
      expect(prompt).toContain(SOURCE_TEXT);
      expect(prompt).toContain('Aim at engineering leads');
    }

    const linkedin = generated.body.results.find((r) => r.platform === 'linkedin_post');
    const draft = await api.call<{ title: string; body: string }>(
      'GET',
      `/v1/drafts/${linkedin?.draftId}`,
      {
        headers: owner.headers,
      },
    );
    expect(draft.status).toBe(200);
    expect(draft.body.body).toBe('# LINKEDIN draft written by the scripted model');
    expect(draft.body.title).toBe('LinkedIn post: Retries without backoff');
  });

  it('refuses with a clear message, and creates nothing, when no AI provider is configured', async () => {
    api = await TestApi.start();
    const owner = await api.signInAsDevOwner();
    const knowledgeId = await createAsset(api, owner, SOURCE_TEXT);

    const response = await api.call<{ error: { code: string; message: string } }>(
      'POST',
      `/v1/knowledge/${knowledgeId}/generate`,
      { headers: owner.headers, payload: { platforms: ['linkedin_post'] } },
    );

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('configuration_error');
    expect(response.body.error.message).toContain('No AI provider is configured');

    const drafts = await api.call<unknown[]>('GET', '/v1/drafts', { headers: owner.headers });
    expect(drafts.body).toEqual([]);
  });

  it("is not available across tenants: another tenant's asset is not found", async () => {
    api = await TestApi.start(live(new ScriptedProvider()));
    const owner = await api.signInAsDevOwner();
    const outsider = await api.signUpTenant('outsider');
    const knowledgeId = await createAsset(api, owner, SOURCE_TEXT);

    const response = await api.call('POST', `/v1/knowledge/${knowledgeId}/generate`, {
      headers: outsider.headers,
      payload: { platforms: ['linkedin_post'] },
    });

    expect(response.status).toBe(404);
  });

  it('lets a member create content but not a viewer, and rejects requests without credentials', async () => {
    api = await TestApi.start(live(new ScriptedProvider()));
    const owner = await api.signInAsDevOwner();
    const member = await api.createUserWithRole(owner, 'member@dev.test', 'member');
    const viewer = await api.createUserWithRole(owner, 'viewer@dev.test', 'viewer');
    const knowledgeId = await createAsset(api, owner, SOURCE_TEXT);
    const path = `/v1/knowledge/${knowledgeId}/generate`;
    const payload = { platforms: ['newsletter'] };

    expect((await api.call('POST', path, { headers: member.headers, payload })).status).toBe(200);
    expect((await api.call('POST', path, { headers: viewer.headers, payload })).status).toBe(403);
    expect((await api.call('POST', path, { payload })).status).toBe(401);
  });

  it('rejects an unknown platform and an empty list with a validation error', async () => {
    api = await TestApi.start(live(new ScriptedProvider()));
    const owner = await api.signInAsDevOwner();
    const knowledgeId = await createAsset(api, owner, SOURCE_TEXT);
    const path = `/v1/knowledge/${knowledgeId}/generate`;

    const unknown = await api.call('POST', path, {
      headers: owner.headers,
      payload: { platforms: ['myspace_post'] },
    });
    const empty = await api.call('POST', path, {
      headers: owner.headers,
      payload: { platforms: [] },
    });

    expect(unknown.status).toBe(400);
    expect(empty.status).toBe(400);
  });
});
