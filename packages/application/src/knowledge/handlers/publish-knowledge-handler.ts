import { KnowledgeId } from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { PublishKnowledgeCommand } from '../commands/publish-knowledge-command.js';

/** Restores an archived asset (or completes its initial publish) to active. */
export class PublishKnowledgeHandler implements CommandHandler<PublishKnowledgeCommand> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: PublishKnowledgeCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;
    knowledge.restore(this.clock);
    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();
  }
}
