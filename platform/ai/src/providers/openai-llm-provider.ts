import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmFinishReason,
  LlmMessage,
  LlmProvider,
  LlmToolCallRequest,
} from './llm-provider.js';

/**
 * `function` is optional because the real SDK's tool call type also
 * includes a "custom" tool call variant with no `function` field — this
 * adapter only supports function-style tools, so it filters those out.
 */
export interface OpenAiToolCall {
  readonly type?: string;
  readonly function?: { readonly name: string; readonly arguments: string };
}

/** OpenAI Chat Completions response shape, narrowed to the fields this adapter reads. */
export interface OpenAiChatCompletionResponse {
  readonly choices: readonly {
    readonly message: {
      readonly content: string | null;
      readonly tool_calls?: readonly OpenAiToolCall[];
    };
    readonly finish_reason: string;
  }[];
  readonly usage?: { readonly prompt_tokens: number; readonly completion_tokens: number };
}

/**
 * `tool` is deliberately excluded: OpenAI requires a `tool_call_id` on any
 * message with that role, which our flat history doesn't carry, so
 * `toOpenAiMessages` always folds a `tool`-role entry into a `user` turn.
 */
export interface OpenAiChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface OpenAiCreateParams {
  readonly model: string;
  readonly messages: OpenAiChatMessage[];
  readonly max_tokens?: number;
  /** Newer models (the o-series and GPT-5 family) accept only this, and reject `max_tokens`. */
  readonly max_completion_tokens?: number;
  readonly temperature?: number;
  readonly tools?: {
    type: 'function';
    function: { name: string; description: string; parameters: { [key: string]: unknown } };
  }[];
}

/**
 * The subset of the `openai` SDK's client this adapter depends on.
 * Keeping the dependency this narrow lets the provider be unit-tested
 * against an in-process fake instead of a real OpenAI account.
 */
export interface OpenAiClientLike {
  chat: {
    completions: {
      create(params: OpenAiCreateParams): Promise<OpenAiChatCompletionResponse>;
    };
  };
}

function stripProviderPrefix(model: string): string {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
}

/**
 * A bare "tool result" message in our flat history (role `tool` with no
 * associated `tool_call_id`) can't round-trip as OpenAI's own `tool` role,
 * which requires that id — it is folded into a user turn instead so the
 * request stays valid regardless of whether the prior assistant turn
 * actually requested a tool call.
 */
/** The o-series and GPT-5 models reject `max_tokens` and want `max_completion_tokens`. */
export function usesCompletionTokenLimit(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

function toOpenAiMessages(messages: readonly LlmMessage[]): OpenAiChatMessage[] {
  return messages.map((message) =>
    message.role === 'tool'
      ? { role: 'user', content: `[tool result] ${message.content}` }
      : { role: message.role, content: message.content },
  );
}

function toFinishReason(finishReason: string): LlmFinishReason {
  if (finishReason === 'length') return 'length';
  if (finishReason === 'tool_calls') return 'tool_call';
  return 'stop';
}

export class OpenAiLlmProvider implements LlmProvider {
  constructor(private readonly client: OpenAiClientLike) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = stripProviderPrefix(request.model);
    const response = await this.client.chat.completions.create({
      model,
      messages: toOpenAiMessages(request.messages),
      ...(usesCompletionTokenLimit(model)
        ? { max_completion_tokens: request.maxOutputTokens }
        : { max_tokens: request.maxOutputTokens }),
      temperature: request.temperature,
      tools: request.tools?.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersSchema as { [key: string]: unknown },
        },
      })),
    });

    const choice = response.choices[0];
    if (choice === undefined) {
      throw new Error('OpenAI response contained no choices');
    }

    const toolCalls: LlmToolCallRequest[] = (choice.message.tool_calls ?? [])
      .filter((call): call is Required<OpenAiToolCall> => call.function !== undefined)
      .map((call) => ({
        toolName: call.function.name,
        argumentsJson: call.function.arguments,
      }));

    return {
      content: choice.message.content ?? '',
      toolCalls,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      finishReason: toFinishReason(choice.finish_reason),
    };
  }
}
