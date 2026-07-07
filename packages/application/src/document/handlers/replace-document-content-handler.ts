import {
  ByteSize,
  ContentEncoding,
  ContentHash,
  DocumentContent,
  DocumentId,
} from '@wisdum/domain';
import type { Clock, DocumentRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { ReplaceDocumentContentCommand } from '../commands/replace-document-content-command.js';
import type { ContentHasher } from '../ports/content-hasher.js';

export class ReplaceDocumentContentHandler implements CommandHandler<ReplaceDocumentContentCommand> {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly hasher: ContentHasher,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReplaceDocumentContentCommand): Promise<void> {
    const found = await this.repository.findById(DocumentId.create(command.documentId));
    if (!found.some) {
      throw new NotFoundError('Document not found', { documentId: command.documentId });
    }
    const document = found.value;
    const hashed = this.hasher.hash(command.content);
    document.replaceContent(
      {
        content: DocumentContent.create(command.content),
        contentHash: ContentHash.create(hashed),
        sizeBytes: ByteSize.create(Buffer.byteLength(command.content)),
        encoding: ContentEncoding.create(command.encoding),
      },
      this.clock,
    );
    await this.repository.save(document);
    await this.events.publishAll(document.pullDomainEvents());
    document.clearDomainEvents();
  }
}
