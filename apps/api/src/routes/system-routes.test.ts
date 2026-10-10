import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { LlmStatus } from '../container/tokens.js';
import { registerSystemRoutes } from './system-routes.js';

async function capabilities(status: LlmStatus): Promise<{ ai: Record<string, unknown> }> {
  const app = Fastify();
  registerSystemRoutes(app, status);
  const response = await app.inject({ method: 'GET', url: '/v1/system/capabilities' });
  await app.close();
  return response.json() as { ai: Record<string, unknown> };
}

describe('GET /v1/system/capabilities', () => {
  it('reports a failed check with its message, and never the model', async () => {
    const result = await capabilities({
      mode: 'live',
      provider: 'anthropic',
      model: 'secret-model-name',
      check: { status: 'failed', message: 'anthropic rejected the credentials.' },
    });

    expect(result.ai).toEqual({
      mode: 'live',
      provider: 'anthropic',
      check: { status: 'failed', message: 'anthropic rejected the credentials.' },
    });
  });

  it('shows the check result once it finishes, because the status is updated in place', async () => {
    const status: LlmStatus = {
      mode: 'live',
      provider: 'openai',
      model: 'm',
      check: { status: 'pending' },
    };
    const app = Fastify();
    registerSystemRoutes(app, status);

    const before = (await app.inject({ method: 'GET', url: '/v1/system/capabilities' })).json() as {
      ai: { check: { status: string } };
    };
    status.check = { status: 'ok', latencyMs: 12 };
    const after = (await app.inject({ method: 'GET', url: '/v1/system/capabilities' })).json() as {
      ai: { check: { status: string } };
    };
    await app.close();

    expect(before.ai.check.status).toBe('pending');
    expect(after.ai.check.status).toBe('ok');
  });

  it('has no check in mock mode', async () => {
    expect((await capabilities({ mode: 'mock' })).ai).toEqual({ mode: 'mock' });
  });
});
