import { ContentReference, KnowledgeId } from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { ImportKnowledgeCommand } from '../commands/import-knowledge-command.js';

export class ImportKnowledgeHandler implements CommandHandler<ImportKnowledgeCommand> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ImportKnowledgeCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;

    knowledge.beginImport(this.clock);

    const ref = ContentReference.create({
      reference: command.sourceUri ?? `import://${command.knowledgeId}`,
    });

    knowledge.completeImport(ref, this.clock);

    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();
  }
}
