import { KnowledgeDescription, KnowledgeId, KnowledgeLabel, KnowledgeTitle } from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { UpdateKnowledgeCommand } from '../commands/update-knowledge-command.js';

export class UpdateKnowledgeHandler implements CommandHandler<UpdateKnowledgeCommand> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateKnowledgeCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;

    if (command.title !== undefined) {
      knowledge.rename(KnowledgeTitle.create(command.title), this.clock);
    }

    if (command.description !== undefined) {
      knowledge.updateDescription(KnowledgeDescription.create(command.description), this.clock);
    }

    if (command.labels !== undefined) {
      // Clear existing and add new
      const current = knowledge.labels;
      for (const lbl of current) {
        knowledge.removeLabel(lbl, this.clock);
      }
      for (const raw of command.labels) {
        knowledge.addLabel(KnowledgeLabel.create(raw), this.clock);
      }
    }

    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();
  }
}
