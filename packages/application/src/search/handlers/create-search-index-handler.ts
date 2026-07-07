import { SearchIndex, SearchIndexId } from '@wisdum/domain';
import type { Clock, SearchIndexRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import { ConflictError } from '../../shared/errors.js';
import type { CreateSearchIndexCommand } from '../commands/create-search-index-command.js';

export class CreateSearchIndexHandler implements CommandHandler<
  CreateSearchIndexCommand,
  { searchIndexId: string }
> {
  constructor(
    private readonly repository: SearchIndexRepository,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateSearchIndexCommand): Promise<{ searchIndexId: string }> {
    const existing = await this.repository.findByName(command.tenantId, command.name);
    if (existing.some) {
      throw new ConflictError('A search index with this name already exists', {
        name: command.name,
      });
    }

    const index = SearchIndex.create(
      {
        id: SearchIndexId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        name: command.name,
        mode: command.mode,
      },
      this.clock,
    );

    await this.repository.save(index);
    await this.events.publishAll(index.pullDomainEvents());
    index.clearDomainEvents();

    return { searchIndexId: index.getId().value() };
  }
}
