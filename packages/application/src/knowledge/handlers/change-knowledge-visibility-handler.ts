import { KnowledgeId, KnowledgeVisibility } from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { ChangeKnowledgeVisibilityCommand } from '../commands/change-knowledge-visibility-command.js';

export class ChangeKnowledgeVisibilityHandler implements CommandHandler<ChangeKnowledgeVisibilityCommand> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ChangeKnowledgeVisibilityCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;
    knowledge.changeVisibility(KnowledgeVisibility.create(command.visibility), this.clock);

    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();
  }
}
