import type { SearchResult } from '@wisdum/domain';
import type { RankingWeights } from '../ranking/ranking-engine.js';

export interface HybridSearchInput {
  readonly keywordHits: readonly SearchResult[];
  readonly semanticHits: readonly SearchResult[];
  readonly weights: RankingWeights;
  readonly limit: number;
}

/** Fuses independently scored keyword and semantic hit lists into one ranking. */
export interface HybridSearch {
  fuse(input: HybridSearchInput): readonly SearchResult[];
}
