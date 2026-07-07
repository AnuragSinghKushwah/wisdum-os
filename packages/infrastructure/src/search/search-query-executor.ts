import { SearchResult } from '@wisdum/domain';
import type { SearchQuery } from '@wisdum/domain';
import type { SearchQueryExecutor } from '@wisdum/application';
import type { UUID } from '@wisdum/types';
import type { SearchProvider } from './search-provider.js';

/** Bridges the application's SearchQueryExecutor port onto a raw SearchProvider. */
export class ProviderSearchQueryExecutor implements SearchQueryExecutor {
  constructor(private readonly provider: SearchProvider) {}

  async execute(searchIndexId: string, query: SearchQuery): Promise<readonly SearchResult[]> {
    const hits = await this.provider.query(searchIndexId, query.text, query.limit, query.offset);
    return hits.map((hit) =>
      SearchResult.create({
        sourceId: hit.documentId as UUID,
        sourceType: 'knowledge',
        score: hit.score,
      }),
    );
  }
}
