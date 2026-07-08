import { describe, expect, it } from 'vitest';
import { AnthropicLlmProvider } from './anthropic-llm-provider.js';
import type { AnthropicClientLike, AnthropicCreateParams } from './anthropic-llm-provider.js';

function fakeClient(
  respond: (params: AnthropicCreateParams) => Awaited<ReturnType<AnthropicClientLike['messages']['create']>>,
): AnthropicClientLike {
  return { messages: { create: (params) => Promise.resolve(respond(params)) } };
}

describe('AnthropicLlmProvider', () => {
  it('strips the provider prefix and forwards the system prompt separately', async () => {
    let seen: AnthropicCreateParams | undefined;
    const provider = new AnthropicLlmProvider(
      fakeClient((params) => {
        seen = params;
        return {
          content: [{ type: 'text', text: 'hi there' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      }),
    );

    await provider.complete({
      model: 'anthropic/claude-sonnet-5',
      messages: [
        { role: 'system', content: 'Be helpful.' },
        { role: 'user', content: 'Hello' },
      ],
    });

    expect(seen?.model).toBe('claude-sonnet-5');
    expect(seen?.system).toBe('Be helpful.');
    expect(seen?.messages).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('folds a bare tool-result message into a user turn', async () => {
    let seen: AnthropicCreateParams | undefined;
    const provider = new AnthropicLlmProvider(
      fakeClient((params) => {
        seen = params;
        return {
          content: [{ type: 'text', text: 'ok' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      }),
    );

    await provider.complete({
      model: 'anthropic/claude-sonnet-5',
      messages: [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: 'Let me check.' },
        { role: 'tool', content: '4' },
      ],
    });

    expect(seen?.messages).toEqual([
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: 'Let me check.' },
      { role: 'user', content: '[tool result] 4' },
    ]);
  });

  it('maps text content, tool_use blocks, and finish reason', async () => {
    const provider = new AnthropicLlmProvider(
      fakeClient(() => ({
        content: [
          { type: 'text', text: 'Using a tool: ' },
          { type: 'tool_use', name: 'search', input: { query: 'wisdum' } },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 20, output_tokens: 8 },
      })),
    );

    const result = await provider.complete({
      model: 'anthropic/claude-sonnet-5',
      messages: [{ role: 'user', content: 'Search for wisdum' }],
    });

    expect(result.content).toBe('Using a tool: ');
    expect(result.toolCalls).toEqual([
      { toolName: 'search', argumentsJson: JSON.stringify({ query: 'wisdum' }) },
    ]);
    expect(result.finishReason).toBe('tool_call');
    expect(result.inputTokens).toBe(20);
    expect(result.outputTokens).toBe(8);
  });

  it('maps max_tokens stop reason to length', async () => {
    const provider = new AnthropicLlmProvider(
      fakeClient(() => ({
        content: [{ type: 'text', text: 'truncated' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 1, output_tokens: 1 },
      })),
    );

    const result = await provider.complete({
      model: 'anthropic/claude-sonnet-5',
      messages: [{ role: 'user', content: 'Go on' }],
    });

    expect(result.finishReason).toBe('length');
  });
});
