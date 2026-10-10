import { describe, expect, it } from 'vitest';
import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from '@wisdum/platform-ai';
import {
  LlmCompletionAdapter,
  MockLlmCompletionPort,
  createLlmCompletionPort,
} from './llm-completion-adapter.js';

function provider(result: Partial<LlmCompletionResult>): {
  llm: LlmProvider;
  seen: LlmCompletionRequest[];
} {
  const seen: LlmCompletionRequest[] = [];
  const llm: LlmProvider = {
    complete: (request) => {
      seen.push(request);
      return Promise.resolve({
        content: 'A draft.',
        toolCalls: [],
        inputTokens: 1,
        outputTokens: 1,
        finishReason: 'stop',
        ...result,
      });
    },
  };
  return { llm, seen };
}

describe('LlmCompletionAdapter', () => {
  it('asks for a generous output budget by default, since some models spend part of it thinking', async () => {
    const { llm, seen } = provider({});

    await new LlmCompletionAdapter(llm, 'm').complete('hello');

    expect(seen[0]?.maxOutputTokens).toBeGreaterThanOrEqual(4096);
  });

  it('passes through a larger budget when the caller asks for one', async () => {
    const { llm, seen } = provider({});

    await new LlmCompletionAdapter(llm, 'm').complete('hello', { maxOutputTokens: 16_000 });

    expect(seen[0]?.maxOutputTokens).toBe(16_000);
  });

  it('ends a cut-off draft with a visible notice when asked to mark truncation', async () => {
    const { llm } = provider({ content: 'Half a post that', finishReason: 'length' });

    const text = await new LlmCompletionAdapter(llm, 'm').complete('hello', {
      markTruncation: true,
    });

    expect(text.startsWith('Half a post that')).toBe(true);
    expect(text).toContain('stopped at its output limit');
  });

  it('leaves machine-read output untouched even when it was cut off', async () => {
    const { llm } = provider({ content: '[{"a":', finishReason: 'length' });

    expect(await new LlmCompletionAdapter(llm, 'm').complete('hello')).toBe('[{"a":');
  });

  it('adds nothing to a complete answer', async () => {
    const { llm } = provider({});

    expect(
      await new LlmCompletionAdapter(llm, 'm').complete('hello', { markTruncation: true }),
    ).toBe('A draft.');
  });
});

describe('LlmCompletionAdapter failures', () => {
  it('reports a provider failure as what to do about it, not as a raw status and body', async () => {
    const llm: LlmProvider = {
      complete: () =>
        Promise.reject(
          Object.assign(new Error('401 {"type":"error","error":{"message":"invalid x-api-key"}}'), {
            status: 401,
          }),
        ),
    };

    const error = await new LlmCompletionAdapter(llm, 'm', 'anthropic')
      .complete('hello')
      .catch((cause: unknown) => cause);

    expect((error as Error).message).toBe(
      'anthropic rejected the credentials. Check ANTHROPIC_API_KEY in .env, then restart.',
    );
  });
});

describe('createLlmCompletionPort', () => {
  it('is the offline mock only when no provider is configured', () => {
    expect(createLlmCompletionPort(undefined, undefined)).toBeInstanceOf(MockLlmCompletionPort);
    expect(createLlmCompletionPort(provider({}).llm, 'm')).toBeInstanceOf(LlmCompletionAdapter);
  });
});
