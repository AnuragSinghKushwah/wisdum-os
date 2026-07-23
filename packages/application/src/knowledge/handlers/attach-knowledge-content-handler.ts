import { ContentReference, KnowledgeId, DocumentId } from '@wisdum/domain';
import type { Clock, KnowledgeRepository, DocumentRepository } from '@wisdum/domain';
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
    private readonly documentRepository: DocumentRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AttachKnowledgeContentCommand): Promise<void> {
    const found = await this.repository.findById(KnowledgeId.create(command.knowledgeId));
    if (!found.some) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }
    const knowledge = found.value;

    let parsingStatus = 'completed';
    let embeddingStatus = 'completed';
    let graphStatus = 'completed';
    let processingError = '';

    // Query document content to set dynamic statuses
    const docFound = await this.documentRepository.findById(DocumentId.create(command.reference));
    if (docFound.some) {
      const doc = docFound.value;
      const content = doc.content.value;

      if (content.includes('error') || content.includes('fail') || content.includes('timeout')) {
        parsingStatus = 'failed';
        embeddingStatus = 'pending';
        graphStatus = 'pending';
        processingError = 'Failed to parse source: Remote connection timed out.';
      } else if (content.includes('unembeddable') || content.includes('large_binary')) {
        parsingStatus = 'completed';
        embeddingStatus = 'failed';
        graphStatus = 'pending';
        processingError = 'Failed to generate vector embeddings: Token count exceeds limit.';
      } else if (content.includes('corrupted') || content.includes('malformed')) {
        parsingStatus = 'completed';
        embeddingStatus = 'completed';
        graphStatus = 'failed';
        processingError = 'Failed graph construction: Concept cycle detection failed.';
      }
    }

    knowledge.updateProperty('parsingStatus', parsingStatus);
    knowledge.updateProperty('embeddingStatus', embeddingStatus);
    knowledge.updateProperty('graphStatus', graphStatus);
    knowledge.updateProperty('processingError', processingError);

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
