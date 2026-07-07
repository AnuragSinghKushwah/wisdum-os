import type { SearchResult } from '@wisdum/domain';

export interface RetrievalRequest {
  readonly searchIndexId: string;
  readonly text: string;
  readonly limit: number;
}

/** Fetches ranked results for a query against one index, by whatever signal it uses. */
export interface Retriever {
  retrieve(request: RetrievalRequest): Promise<readonly SearchResult[]>;
}
