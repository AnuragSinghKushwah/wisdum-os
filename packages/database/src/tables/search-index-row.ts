import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `search_indexes` table. */
export interface SearchIndexRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly mode: string;
  readonly keyword_weight: number;
  readonly semantic_weight: number;
  readonly recency_weight: number;
  readonly status: string;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `search_index_documents` table. */
export interface SearchIndexDocumentRow {
  readonly search_index_id: UUID;
  readonly source_id: UUID;
  readonly source_type: string;
  readonly state: string;
  readonly chunk_count: number;
  readonly indexed_at: IsoTimestamp;
}
