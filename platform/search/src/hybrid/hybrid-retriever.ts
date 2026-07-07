import type { SearchResult } from '@wisdum/domain';
import type { RankingWeights } from '../ranking/ranking-engine.js';
import type { RetrievalRequest, Retriever } from '../retriever/retriever.js';
import type { HybridSearch } from './hybrid-search.js';

/** Composes a keyword and a semantic retriever, fusing their results into one ranked list. */
export class HybridRetriever implements Retriever {
  constructor(
    private readonly keyword: Retriever,
    private readonly semantic: Retriever,
    private readonly hybridSearch: HybridSearch,
    private readonly weights: RankingWeights,
  ) {}

  async retrieve(request: RetrievalRequest): Promise<readonly SearchResult[]> {
    const [keywordHits, semanticHits] = await Promise.all([
      this.keyword.retrieve(request),
      this.semantic.retrieve(request),
    ]);
    return this.hybridSearch.fuse({
      keywordHits,
      semanticHits,
      weights: this.weights,
      limit: request.limit,
    });
  }
}
