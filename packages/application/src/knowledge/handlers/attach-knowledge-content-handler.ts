import { ContentReference, KnowledgeId } from '@wisdum/domain';
import type { Clock, KnowledgeRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AttachKnowledgeContentCommand } from '../commands/attach-knowledge-content-command.js';

/**
 * Links stored content (e.g. a Document id) to a draft knowledge asset and
 * activates it. Reuses the import lifecycle (draft -> importing -> active)
 * since attaching manually-authored content is, structurally, the same
 * transition as completing an import.
 */
export class AttachKnowledgeContentHandler implements CommandHandler<AttachKnowledgeContentCommand> {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AttachKnowledgeContentCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;
    if (knowledge.status.value === 'draft') {
      knowledge.beginImport(this.clock);
    }
    knowledge.completeImport(
      ContentReference.create({ reference: command.reference, mimeType: command.mimeType }),
      this.clock,
    );
    await this.repository.save(knowledge);
    await this.events.publishAll(knowledge.pullDomainEvents());
    knowledge.clearDomainEvents();
  }
}
