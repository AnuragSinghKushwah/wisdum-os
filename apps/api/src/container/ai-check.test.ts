import { describe, expect, it } from 'vitest';
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from '@wisdum/platform-ai';
import { checkAiProvider, describeAiFailure } from './ai-check.js';

const ANSWER: LlmCompletionResult = {
  content: 'OK',
  toolCalls: [],
  inputTokens: 1,
  outputTokens: 1,
  finishReason: 'stop',
};

function provider(
  complete: (request: LlmCompletionRequest) => Promise<LlmCompletionResult>,
): LlmProvider {
  return { complete };
}

function failing(status: number | undefined, message: string): LlmProvider {
  return provider(() =>
    Promise.reject(Object.assign(new Error(message), status === undefined ? {} : { status })),
  );
}

const target = (llm: LlmProvider, extra: Record<string, unknown> = {}) => ({
  provider: llm,
  model: 'a-model',
  name: 'anthropic',
  ...extra,
});

describe('checkAiProvider', () => {
  it('is ok when the provider answers, and asks only one tiny question', async () => {
    const seen: LlmCompletionRequest[] = [];
    const result = await checkAiProvider(
      target(
        provider((request) => {
          seen.push(request);
          return Promise.resolve(ANSWER);
        }),
      ),
    );

    expect(result.status).toBe('ok');
    expect(seen).toHaveLength(1);
    expect(seen[0]?.model).toBe('a-model');
    expect(seen[0]?.maxOutputTokens).toBeLessThanOrEqual(256);
  });

  it('is ok even when the answer is empty, because the key and model were accepted', async () => {
    const result = await checkAiProvider(
      target(provider(() => Promise.resolve({ ...ANSWER, content: '', finishReason: 'length' }))),
    );

    expect(result.status).toBe('ok');
  });

  it('tells a rejected key which setting to fix', async () => {
    const result = await checkAiProvider(target(failing(401, 'invalid x-api-key')));

    expect(result).toEqual({
      status: 'failed',
      message: 'anthropic rejected the credentials. Check ANTHROPIC_API_KEY in .env, then restart.',
    });
  });

  it('lists the models the key can use when the configured one is not found', async () => {
    const result = await checkAiProvider(
      target(failing(404, 'model: a-model'), {
        listModels: () => Promise.resolve(['m-one', 'm-two']),
      }),
    );

    expect(result.status).toBe('failed');
    expect((result as { message: string }).message).toContain('no model called "a-model"');
    expect((result as { message: string }).message).toContain('REASONING_LLM_MODEL');
    expect((result as { message: string }).message).toContain('m-one, m-two');
  });

  it('still reports the missing model when listing models fails', async () => {
    const result = await checkAiProvider(
      target(failing(404, 'nope'), { listModels: () => Promise.reject(new Error('boom')) }),
    );

    expect((result as { message: string }).message).toContain('no model called');
  });

  it('asks for a model when none is configured, with the models available', async () => {
    const result = await checkAiProvider({
      provider: provider(() =>
        Promise.reject(
          new Error('No Gemini model is set. Set REASONING_LLM_MODEL to a model your key can use.'),
        ),
      ),
      model: '',
      name: 'gemini',
      listModels: () => Promise.resolve(['gemini-x']),
    });

    expect((result as { message: string }).message).toContain('REASONING_LLM_MODEL');
    expect((result as { message: string }).message).toContain('gemini-x');
  });

  it('explains a rate limit or an empty account', async () => {
    const result = await checkAiProvider(target(failing(429, 'rate limit exceeded')));

    expect((result as { message: string }).message).toContain(
      'rate limited, out of credit, or over its quota',
    );
  });

  it('explains an unreachable provider', async () => {
    const result = await checkAiProvider(
      target(failing(undefined, 'fetch failed: ECONNREFUSED 127.0.0.1:11434')),
    );

    expect((result as { message: string }).message).toContain('Could not reach anthropic');
  });

  it('says a retired model is gone, and lists what is available, when the provider answers 410', async () => {
    const result = await checkAiProvider({
      ...target(
        failing(
          410,
          "410 The model 'meta/llama-3.3-70b-instruct' has reached its end of life and is no longer available.",
        ),
        { name: 'nvidia-nim', model: 'meta/llama-3.3-70b-instruct' },
      ),
      listModels: () => Promise.resolve(['nvidia/nemotron-3-super-120b-a12b']),
    });

    const message = (result as { message: string }).message;
    expect(message).toContain('has retired the model "meta/llama-3.3-70b-instruct"');
    expect(message).toContain('REASONING_LLM_MODEL');
    expect(message).toContain('nvidia/nemotron-3-super-120b-a12b');
  });

  it('explains an unreachable server when the SDK reports only "Connection error."', async () => {
    const result = await checkAiProvider(target(failing(undefined, 'Connection error.')));

    expect((result as { message: string }).message).toContain('Could not reach anthropic');
  });

  it('recognises Gemini reporting a bad key as a 400 with a message', async () => {
    const result = await checkAiProvider(
      target(
        failing(400, 'Gemini API error (400): API key not valid. Please pass a valid API key.'),
      ),
    );

    expect((result as { message: string }).message).toContain('rejected the credentials');
  });

  it('reads the status out of a provider message when the error carries none', async () => {
    const result = await checkAiProvider(
      target(failing(undefined, 'Gemini API error (403): API key not valid')),
    );

    expect((result as { message: string }).message).toContain('rejected the credentials');
  });
});

describe('describeAiFailure', () => {
  it('names the setting for each provider', () => {
    expect(
      describeAiFailure(Object.assign(new Error('x'), { status: 401 }), {
        name: 'openai',
        model: 'm',
      }),
    ).toContain('OPENAI_API_KEY');
    expect(
      describeAiFailure(Object.assign(new Error('x'), { status: 401 }), {
        name: 'gemini',
        model: 'm',
      }),
    ).toContain('GEMINI_API_KEY');
    expect(
      describeAiFailure(Object.assign(new Error('Authorization failed'), { status: 403 }), {
        name: 'nvidia-nim',
        model: 'm',
      }),
    ).toContain('NVIDIA_API_KEY');
  });

  it('never returns an empty message', () => {
    expect(
      describeAiFailure(new Error(''), { name: 'anthropic', model: 'm' }).length,
    ).toBeGreaterThan(10);
  });
});
