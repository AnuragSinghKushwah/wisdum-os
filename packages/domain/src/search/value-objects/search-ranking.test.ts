import { describe, expect, it } from 'vitest';
import { SearchRanking } from './search-ranking.js';

describe('SearchRanking', () => {
  it('balanced() splits keyword and semantic weight evenly with no recency', () => {
    const ranking = SearchRanking.balanced();
    expect(ranking.keywordWeight).toBe(0.5);
    expect(ranking.semanticWeight).toBe(0.5);
    expect(ranking.recencyWeight).toBe(0);
  });

  it('accepts weights that sum to 1', () => {
    expect(() =>
      SearchRanking.create({ keywordWeight: 0.3, semanticWeight: 0.6, recencyWeight: 0.1 }),
    ).not.toThrow();
  });

  it('rejects weights that do not sum to 1', () => {
    expect(() => SearchRanking.create({ keywordWeight: 0.5, semanticWeight: 0.6 })).toThrow(
      /sum to 1/i,
    );
  });

  it('rejects a weight outside [0, 1]', () => {
    expect(() => SearchRanking.create({ keywordWeight: 1.5, semanticWeight: -0.5 })).toThrow();
  });
});
