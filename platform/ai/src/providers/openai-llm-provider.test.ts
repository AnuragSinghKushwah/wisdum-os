import { describe, expect, it } from 'vitest';
import { OpenAiLlmProvider } from './openai-llm-provider.js';
import type { OpenAiClientLike, OpenAiCreateParams } from './openai-llm-provider.js';

function fakeClient(
  respond: (
    params: OpenAiCreateParams,
  ) => Awaited<ReturnType<OpenAiClientLike['chat']['completions']['create']>>,
): OpenAiClientLike {
  return { chat: { completions: { create: (params) => Promise.resolve(respond(params)) } } };
}

describe('OpenAiLlmProvider', () => {
  it('strips the provider prefix and forwards system/user/assistant roles as-is', async () => {
    let seen: OpenAiCreateParams | undefined;
    const provider = new OpenAiLlmProvider(
      fakeClient((params) => {
        seen = params;
        return {
          choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        };
      }),
    );

    await provider.complete({
      model: 'openai/gpt-5',
      messages: [
        { role: 'system', content: 'Be helpful.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(seen?.model).toBe('gpt-5');
    expect(seen?.messages).toEqual([
      { role: 'system', content: 'Be helpful.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('folds a bare tool-result message into a user turn', async () => {
    let seen: OpenAiCreateParams | undefined;
    const provider = new OpenAiLlmProvider(
      fakeClient((params) => {
        seen = params;
        return {
          choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        };
      }),
    );

    await provider.complete({
      model: 'openai/gpt-5',
      messages: [{ role: 'tool', content: '4' }],
    });

    expect(seen?.messages).toEqual([{ role: 'user', content: '[tool result] 4' }]);
  });

  it('maps tool_calls and the tool_calls finish reason', async () => {
    const provider = new OpenAiLlmProvider(
      fakeClient(() => ({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [{ function: { name: 'search', arguments: '{"query":"wisdum"}' } }],
            },
            finish_reason: 'tool_calls',
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 8 },
      })),
    );

    const result = await provider.complete({
      model: 'openai/gpt-5',
      messages: [{ role: 'user', content: 'Search for wisdum' }],
    });

    expect(result.content).toBe('');
    expect(result.toolCalls).toEqual([{ toolName: 'search', argumentsJson: '{"query":"wisdum"}' }]);
    expect(result.finishReason).toBe('tool_call');
    expect(result.inputTokens).toBe(20);
    expect(result.outputTokens).toBe(8);
  });

  it('maps the length finish reason', async () => {
    const provider = new OpenAiLlmProvider(
      fakeClient(() => ({
        choices: [{ message: { content: 'truncated' }, finish_reason: 'length' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      })),
    );

    const result = await provider.complete({
      model: 'openai/gpt-5',
      messages: [{ role: 'user', content: 'Go on' }],
    });

    expect(result.finishReason).toBe('length');
  });

  it('throws if the response contains no choices', async () => {
    const provider = new OpenAiLlmProvider(
      fakeClient(() => ({ choices: [], usage: { prompt_tokens: 0, completion_tokens: 0 } })),
    );

    await expect(
      provider.complete({ model: 'openai/gpt-5', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(/no choices/);
  });
});
