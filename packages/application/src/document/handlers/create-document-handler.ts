import {
  ByteSize,
  ContentEncoding,
  ContentHash,
  Document,
  DocumentContent,
  DocumentId,
  LanguageCode,
  MimeType,
} from '@wisdum/domain';
import type { Clock, DocumentRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { CreateDocumentCommand } from '../commands/create-document-command.js';
import type { ContentHasher } from '../ports/content-hasher.js';

export class CreateDocumentHandler implements CommandHandler<
  CreateDocumentCommand,
  { documentId: string }
> {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly ids: IdGenerator,
    private readonly hasher: ContentHasher,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateDocumentCommand): Promise<{ documentId: string }> {
    const hashed = this.hasher.hash(command.content);
    const existing = await this.repository.findByContentHash(
      command.tenantId,
      ContentHash.create(hashed),
    );
    if (existing.some) {
      return { documentId: existing.value.getId().value() };
    }

    const document = Document.create(
      {
        id: DocumentId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        content: DocumentContent.create(command.content),
        mimeType: MimeType.create(command.mimeType),
        encoding: ContentEncoding.create(command.encoding),
        sizeBytes: ByteSize.create(Buffer.byteLength(command.content)),
        contentHash: ContentHash.create(hashed),
        language:
          command.language !== undefined ? LanguageCode.create(command.language) : undefined,
      },
      this.clock,
    );

    await this.repository.save(document);
    await this.events.publishAll(document.pullDomainEvents());
    document.clearDomainEvents();

    return { documentId: document.getId().value() };
  }
}
