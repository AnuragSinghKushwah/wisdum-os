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
import type { EmbeddingPipeline } from '@wisdum/platform-search';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { CreateDocumentCommand } from '../commands/create-document-command.js';
import type { ContentHasher } from '../ports/content-hasher.js';
import { preprocessContent } from '../services/preprocess-content.js';

/** MIME types worth embedding. Binary/opaque content has no text to chunk. */
const EMBEDDABLE_MIME_PREFIXES = ['text/', 'application/json'];

function isEmbeddable(mimeType: string): boolean {
  return EMBEDDABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

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
    private readonly embeddingPipeline?: EmbeddingPipeline,
    private readonly embeddingModel?: string,
  ) {}

  async execute(command: CreateDocumentCommand): Promise<{ documentId: string }> {
    const { parsedContent, mimeType } = await preprocessContent(command.content, command.mimeType);
    const hashed = this.hasher.hash(parsedContent);
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
        content: DocumentContent.create(parsedContent),
        mimeType: MimeType.create(mimeType),
        encoding: ContentEncoding.create(command.encoding),
        sizeBytes: ByteSize.create(Buffer.byteLength(parsedContent)),
        contentHash: ContentHash.create(hashed),
        language:
          command.language !== undefined ? LanguageCode.create(command.language) : undefined,
      },
      this.clock,
    );

    await this.repository.save(document);
    await this.events.publishAll(document.pullDomainEvents());
    document.clearDomainEvents();

    if (this.embeddingPipeline !== undefined && isEmbeddable(mimeType)) {
      try {
        await this.embeddingPipeline.run({
          indexName: `knowledge:${command.tenantId}`,
          sourceId: document.getId().value(),
          text: parsedContent,
          model: this.embeddingModel ?? '',
        });
      } catch {
        // Embedding is best-effort: a flaky provider must never block capture.
      }
    }

    return { documentId: document.getId().value() };
  }
}
