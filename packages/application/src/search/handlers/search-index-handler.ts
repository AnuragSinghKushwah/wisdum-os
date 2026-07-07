import { SearchQuery } from '@wisdum/domain';
import type { SearchResult } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import type { SearchQueryExecutor } from '../ports/search-query-executor.js';
import type { SearchIndexQuery } from '../queries/search-query.js';

export class SearchIndexHandler implements QueryHandler<SearchIndexQuery, readonly SearchResult[]> {
  constructor(private readonly executor: SearchQueryExecutor) {}

  execute(query: SearchIndexQuery): Promise<readonly SearchResult[]> {
    const domainQuery = SearchQuery.create({
      text: query.text,
      mode: query.mode,
      limit: query.limit,
      offset: query.offset,
    });
    return this.executor.execute(query.searchIndexId, domainQuery);
  }
}
