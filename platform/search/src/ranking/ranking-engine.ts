export interface RankableHit {
  readonly sourceId: string;
  readonly keywordScore?: number;
  readonly semanticScore?: number;
  readonly recencyScore?: number;
}

export interface RankingWeights {
  readonly keywordWeight: number;
  readonly semanticWeight: number;
  readonly recencyWeight: number;
}

export interface RankedHit {
  readonly sourceId: string;
  readonly score: number;
}

/** Blends per-signal scores into one ranking, per an index's ranking policy. */
export interface RankingEngine {
  rank(hits: readonly RankableHit[], weights: RankingWeights): readonly RankedHit[];
}
