import { afterEach, describe, expect, it } from 'vitest';
import { TestApi } from './test-api.js';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

describe('client errors', () => {
  it('answers a JSON request with no body with 400, not a 500', async () => {
    api = await TestApi.start();

    const response = await api.call<{ error: { code: string; message: string } }>(
      'POST',
      '/v1/auth/login',
      { headers: { 'content-type': 'application/json' } },
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('bad_request');
  });

  it('answers an unsupported media type with 415, not a 500', async () => {
    api = await TestApi.start();

    const response = await api.call<{ error: { code: string } }>('POST', '/v1/auth/login', {
      headers: { 'content-type': 'application/x-nonsense' },
      payload: 'x',
    });

    expect(response.status).toBe(415);
    expect(response.body.error.code).toBe('bad_request');
  });
});
