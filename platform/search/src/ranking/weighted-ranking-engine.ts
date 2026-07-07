import type { RankableHit, RankedHit, RankingEngine, RankingWeights } from './ranking-engine.js';

/** Weighted sum of per-signal scores; missing signals count as zero. */
export class WeightedRankingEngine implements RankingEngine {
  rank(hits: readonly RankableHit[], weights: RankingWeights): readonly RankedHit[] {
    return hits
      .map((hit) => ({
        sourceId: hit.sourceId,
        score:
          (hit.keywordScore ?? 0) * weights.keywordWeight +
          (hit.semanticScore ?? 0) * weights.semanticWeight +
          (hit.recencyScore ?? 0) * weights.recencyWeight,
      }))
      .sort((a, b) => b.score - a.score);
  }
}
