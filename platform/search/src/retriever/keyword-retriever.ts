import { SearchResult } from '@wisdum/domain';
import type { SearchSourceType } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { KeywordIndex } from './keyword-index.js';
import type { RetrievalRequest, Retriever } from './retriever.js';

/** Retrieves via lexical match against a `KeywordIndex`. */
export class KeywordRetriever implements Retriever {
  constructor(
    private readonly index: KeywordIndex,
    private readonly sourceType: SearchSourceType = 'knowledge',
  ) {}

  async retrieve(request: RetrievalRequest): Promise<readonly SearchResult[]> {
    const hits = await this.index.query(request.searchIndexId, request.text, request.limit, 0);
    return hits.map((hit) =>
      SearchResult.create({
        sourceId: hit.documentId as UUID,
        sourceType: this.sourceType,
        score: hit.score,
      }),
    );
  }
}
