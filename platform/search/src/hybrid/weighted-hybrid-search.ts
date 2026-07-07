import { SearchResult } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { RankableHit, RankingEngine } from '../ranking/ranking-engine.js';
import type { HybridSearch, HybridSearchInput } from './hybrid-search.js';

/** Merges per-source scores across signals, then delegates blending to a `RankingEngine`. */
export class WeightedHybridSearch implements HybridSearch {
  constructor(private readonly rankingEngine: RankingEngine) {}

  fuse(input: HybridSearchInput): readonly SearchResult[] {
    const bySource = new Map<string, RankableHit>();
    for (const hit of input.keywordHits) {
      bySource.set(hit.sourceId, { sourceId: hit.sourceId, keywordScore: hit.score });
    }
    for (const hit of input.semanticHits) {
      const existing = bySource.get(hit.sourceId) ?? { sourceId: hit.sourceId };
      bySource.set(hit.sourceId, { ...existing, semanticScore: hit.score });
    }

    return this.rankingEngine
      .rank([...bySource.values()], input.weights)
      .slice(0, input.limit)
      .map((ranked) =>
        SearchResult.create({
          sourceId: ranked.sourceId as UUID,
          sourceType: 'knowledge',
          score: Math.max(0, Math.min(1, ranked.score)),
        }),
      );
  }
}
