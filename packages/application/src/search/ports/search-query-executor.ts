import type { SearchQuery, SearchResult } from '@wisdum/domain';

/**
 * Executes a validated SearchQuery against the physical index. The domain
 * models the query and result shapes; running the query against the search
 * engine (Meilisearch, a vector store, or a hybrid fusion) is a runtime
 * concern implemented behind this port.
 */
export interface SearchQueryExecutor {
  execute(searchIndexId: string, query: SearchQuery): Promise<readonly SearchResult[]>;
}
