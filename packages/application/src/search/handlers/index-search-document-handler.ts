import { SearchIndexId } from '@wisdum/domain';
import type { Clock, SearchIndexRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { IndexSearchDocumentCommand } from '../commands/index-search-document-command.js';
import type { SearchIndexer } from '../ports/search-indexer.js';

const DEFAULT_CHUNK_COUNT = 1;

/** Stores a source's text in the physical index and records the membership on the aggregate. */
export class IndexSearchDocumentHandler
  implements CommandHandler<IndexSearchDocumentCommand, void>
{
  constructor(
    private readonly repository: SearchIndexRepository,
    private readonly indexer: SearchIndexer,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: IndexSearchDocumentCommand): Promise<void> {
    const found = await this.repository.findById(SearchIndexId.create(command.searchIndexId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Search index not found', { searchIndexId: command.searchIndexId });
    }
    const index = found.value;

    await this.indexer.index(command.searchIndexId, command.sourceId, command.text);

    index.recordDocumentIndexed(
      {
        sourceId: command.sourceId as UUID,
        sourceType: command.sourceType,
        chunkCount: command.chunkCount ?? DEFAULT_CHUNK_COUNT,
      },
      this.clock,
    );

    await this.repository.save(index);
    await this.events.publishAll(index.pullDomainEvents());
    index.clearDomainEvents();
  }
}
