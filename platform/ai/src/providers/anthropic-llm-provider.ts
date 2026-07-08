import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmFinishReason,
  LlmMessage,
  LlmProvider,
  LlmToolCallRequest,
} from './llm-provider.js';

/**
 * A single content block, typed permissively: the real SDK's `ContentBlock`
 * union has more variants than this adapter cares about (thinking blocks,
 * server tool use, etc.), so this only requires the fields actually read,
 * all as optional, rather than a closed discriminated union — any real
 * block value satisfies it structurally.
 */
export interface AnthropicContentBlock {
  readonly type: string;
  readonly text?: string;
  readonly name?: string;
  readonly input?: unknown;
}

/** Anthropic Messages API response shape, narrowed to the fields this adapter reads. */
export interface AnthropicMessageResponse {
  readonly content: readonly AnthropicContentBlock[];
  /** Real values include more variants (e.g. `pause_turn`, `refusal`); unrecognized ones map to `'stop'`. */
  readonly stop_reason: string | null;
  readonly usage: { readonly input_tokens: number; readonly output_tokens: number };
}

/** Anthropic requires tool input schemas to be a JSON Schema object at the top level. */
export interface AnthropicToolInputSchema {
  type: 'object';
  [key: string]: unknown;
}

export interface AnthropicCreateParams {
  readonly model: string;
  readonly system?: string;
  readonly messages: { role: 'user' | 'assistant'; content: string }[];
  readonly max_tokens: number;
  readonly temperature?: number;
  readonly tools?: { name: string; description: string; input_schema: AnthropicToolInputSchema }[];
}

/**
 * The subset of `@anthropic-ai/sdk`'s client this adapter depends on.
 * Keeping the dependency this narrow lets the provider be unit-tested
 * against an in-process fake instead of a real Anthropic account.
 */
export interface AnthropicClientLike {
  messages: {
    create(params: AnthropicCreateParams): Promise<AnthropicMessageResponse>;
  };
}

const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

function stripProviderPrefix(model: string): string {
  const slash = model.indexOf('/');
  return slash === -1 ? model : model.slice(slash + 1);
}

/**
 * The Anthropic Messages API has no `system` or `tool` role inside its
 * `messages` array — the system prompt is a separate top-level parameter,
 * and a bare "tool result" message (our history keeps a flat role list,
 * not proper `tool_result` content blocks) is folded into a user turn so
 * it survives the round trip without the API rejecting an unknown role.
 */
function toAnthropicMessages(
  messages: readonly LlmMessage[],
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: message.role === 'tool' ? `[tool result] ${message.content}` : message.content,
    }));
}

function toFinishReason(stopReason: AnthropicMessageResponse['stop_reason']): LlmFinishReason {
  if (stopReason === 'max_tokens') return 'length';
  if (stopReason === 'tool_use') return 'tool_call';
  return 'stop';
}

export class AnthropicLlmProvider implements LlmProvider {
  constructor(private readonly client: AnthropicClientLike) {}

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const systemPrompt = request.messages.find((message) => message.role === 'system')?.content;

    const response = await this.client.messages.create({
      model: stripProviderPrefix(request.model),
      system: systemPrompt,
      messages: toAnthropicMessages(request.messages),
      max_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      temperature: request.temperature,
      tools: request.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parametersSchema as AnthropicToolInputSchema,
      })),
    });

    const content = response.content
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('');

    const toolCalls: LlmToolCallRequest[] = response.content
      .filter((block) => block.type === 'tool_use' && typeof block.name === 'string')
      .map((block) => ({
        toolName: block.name as string,
        argumentsJson: JSON.stringify(block.input),
      }));

    return {
      content,
      toolCalls,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      finishReason: toFinishReason(response.stop_reason),
    };
  }
}
