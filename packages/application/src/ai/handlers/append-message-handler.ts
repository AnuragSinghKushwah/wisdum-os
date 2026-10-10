import { ConversationId, ConversationMessage, TokenUsage } from '@wisdum/domain';
import type { Clock, ConversationRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AppendMessageCommand } from '../commands/append-message-command.js';

export class AppendMessageHandler implements CommandHandler<AppendMessageCommand> {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AppendMessageCommand): Promise<void> {
    const found = await this.repository.findById(ConversationId.create(command.conversationId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Conversation not found', {
        conversationId: command.conversationId,
      });
    }
    const conversation = found.value;
    const message = ConversationMessage.create({
      role: command.role,
      content: command.content,
      createdAt: this.clock.now(),
      usage:
        command.inputTokens !== undefined || command.outputTokens !== undefined
          ? TokenUsage.create({
              inputTokens: command.inputTokens ?? 0,
              outputTokens: command.outputTokens ?? 0,
            })
          : undefined,
    });
    conversation.appendMessage(message, this.clock);
    await this.repository.save(conversation);
    await this.events.publishAll(conversation.pullDomainEvents());
    conversation.clearDomainEvents();
  }
}
