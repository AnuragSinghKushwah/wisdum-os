import { Conversation, ConversationId, ModelReference } from '@wisdum/domain';
import type { Clock, ConversationRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { StartConversationCommand } from '../commands/start-conversation-command.js';

export class StartConversationHandler implements CommandHandler<
  StartConversationCommand,
  { conversationId: string }
> {
  constructor(
    private readonly repository: ConversationRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: StartConversationCommand): Promise<{ conversationId: string }> {
    const conversation = Conversation.start(
      {
        id: ConversationId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        model: ModelReference.create({ provider: command.provider, modelName: command.modelName }),
        ownerId: command.ownerId as UUID,
        title: command.title,
      },
      this.clock,
    );

    await this.repository.save(conversation);
    await this.events.publishAll(conversation.pullDomainEvents());
    conversation.clearDomainEvents();

    return { conversationId: conversation.getId().value() };
  }
}
