import { SearchQuery } from '@wisdum/domain';
import type { SearchResult } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { SearchIndexReadModel } from '../ports/search-index-read-model.js';
import type { SearchQueryExecutor } from '../ports/search-query-executor.js';
import type { SearchIndexQuery } from '../queries/search-query.js';

export class SearchIndexHandler implements QueryHandler<SearchIndexQuery, readonly SearchResult[]> {
  constructor(
    private readonly executor: SearchQueryExecutor,
    private readonly indexes: SearchIndexReadModel,
  ) {}

  async execute(query: SearchIndexQuery): Promise<readonly SearchResult[]> {
    // An index in another tenant is reported exactly like a missing one, and is never queried.
    const index = await this.indexes.findById(query.tenantId, query.searchIndexId);
    if (index === undefined) {
      throw new NotFoundError('Search index not found', { searchIndexId: query.searchIndexId });
    }

    const domainQuery = SearchQuery.create({
      text: query.text,
      mode: query.mode,
      limit: query.limit,
      offset: query.offset,
    });
    return this.executor.execute(query.searchIndexId, domainQuery);
  }
}
