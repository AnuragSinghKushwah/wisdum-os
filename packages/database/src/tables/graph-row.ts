import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `concepts` table. */
export interface ConceptRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly normalized_name: string;
  readonly description: string;
  readonly mention_count: number;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `concept_mentions` table. */
export interface ConceptMentionRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly concept_id: UUID;
  readonly knowledge_id: UUID;
  readonly created_at: IsoTimestamp;
}

/** Raw row shape of the `concept_relationships` table. */
export interface ConceptRelationshipRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly concept_a_id: UUID;
  readonly concept_b_id: UUID;
  readonly relationship_type: string;
  readonly occurrence_count: number;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
