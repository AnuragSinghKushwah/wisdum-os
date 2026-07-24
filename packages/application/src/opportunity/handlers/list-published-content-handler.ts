import type { PublishedContentRepository } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { toPublishedContentDto } from '../dto/published-content-dto.js';
import type { PublishedContentDto } from '../dto/published-content-dto.js';
import type { ListPublishedContentQuery } from '../queries/list-published-content-query.js';

export class ListPublishedContentHandler implements QueryHandler<
  ListPublishedContentQuery,
  readonly PublishedContentDto[]
> {
  constructor(private readonly published: PublishedContentRepository) {}

  async execute(query: ListPublishedContentQuery): Promise<readonly PublishedContentDto[]> {
    const found = await this.published.listByTenant(query.tenantId);
    return found.map(toPublishedContentDto);
  }
}
