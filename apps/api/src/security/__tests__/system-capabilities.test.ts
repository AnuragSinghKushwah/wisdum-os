import { afterEach, describe, expect, it } from 'vitest';
import { ScriptedProvider, live } from './scripted-provider.js';
import { TestApi } from './test-api.js';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

describe('GET /v1/system/capabilities', () => {
  it('says the AI is a mock until a provider is configured', async () => {
    api = await TestApi.start();
    const owner = await api.signInAsDevOwner();

    const response = await api.call<{ ai: { mode: string } }>('GET', '/v1/system/capabilities', {
      headers: owner.headers,
    });

    expect(response.status).toBe(200);
    expect(response.body.ai.mode).toBe('mock');
  });

  it('names the provider when one is configured, never exposes the model or keys, and skips the check for an injected provider', async () => {
    api = await TestApi.start(live(new ScriptedProvider()));
    const owner = await api.signInAsDevOwner();

    const response = await api.call<{ ai: Record<string, string> }>(
      'GET',
      '/v1/system/capabilities',
      {
        headers: owner.headers,
      },
    );

    expect(response.body.ai).toEqual({
      mode: 'live',
      provider: 'scripted',
      check: { status: 'skipped' },
    });
  });
});
