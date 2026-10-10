import { ConversationId, ConversationMessage, TokenUsage } from '@wisdum/domain';
import type { Clock, ConversationRepository } from '@wisdum/domain';
import { WisdumError } from '@wisdum/errors';
import type { ContextBuilder } from '../context/context-builder.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { ToolProvider } from '../providers/tool-provider.js';
import type {
  ConversationRuntime,
  ConversationTurnRequest,
  ConversationTurnResult,
} from './conversation-runtime.js';

const DEFAULT_MAX_CONTEXT_TOKENS = 8000;

/**
 * Reference `ConversationRuntime`: builds context with a `ContextBuilder`,
 * completes with an `LlmProvider`, executes any requested tool calls
 * through a `ToolProvider`, and persists every turn onto the
 * `Conversation` aggregate via its repository.
 */
export class AssistantConversationRuntime implements ConversationRuntime {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly llm: LlmProvider,
    private readonly contextBuilder: ContextBuilder,
    private readonly clock: Clock,
    private readonly tools?: ToolProvider,
  ) {}

  async runTurn(request: ConversationTurnRequest): Promise<ConversationTurnResult> {
    const found = await this.repository.findById(ConversationId.create(request.conversationId));
    if (!found.some || found.value.tenantId !== request.tenantId) {
      throw new WisdumError('not_found', 'Conversation not found', {
        conversationId: request.conversationId,
      });
    }
    const conversation = found.value;

    conversation.appendMessage(
      ConversationMessage.create({
        role: 'user',
        content: request.userMessage,
        createdAt: this.clock.now(),
      }),
      this.clock,
    );

    const context = this.contextBuilder.build({
      systemPrompt: request.systemPrompt,
      history: conversation.messages,
      maxContextTokens: request.maxContextTokens ?? DEFAULT_MAX_CONTEXT_TOKENS,
    });

    const completion = await this.llm.complete({
      model: conversation.model.toString(),
      messages: context,
      tools: this.tools?.listTools(),
    });

    conversation.appendMessage(
      ConversationMessage.create({
        role: 'assistant',
        content: completion.content,
        createdAt: this.clock.now(),
        usage: TokenUsage.create({
          inputTokens: completion.inputTokens,
          outputTokens: completion.outputTokens,
        }),
      }),
      this.clock,
    );

    for (const toolCall of completion.toolCalls) {
      if (this.tools === undefined) continue;
      const result = await this.tools.invoke(toolCall);
      conversation.appendMessage(
        ConversationMessage.create({
          role: 'tool',
          content: result.resultJson,
          createdAt: this.clock.now(),
        }),
        this.clock,
      );
    }

    await this.repository.save(conversation);

    return { assistantMessage: completion.content, toolCalls: completion.toolCalls };
  }
}
