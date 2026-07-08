import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `insights` table. */
export interface InsightRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly summary: string;
  readonly concept_ids: readonly UUID[];
  readonly source_knowledge_ids: readonly UUID[];
  readonly created_at: IsoTimestamp;
}

/** Raw row shape of the `opportunities` table. */
export interface OpportunityRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly insight_id: UUID;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `content_drafts` table. */
export interface ContentDraftRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly opportunity_id: UUID;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `published_content` table. */
export interface PublishedContentRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly draft_id: UUID;
  readonly opportunity_id: UUID;
  readonly slug: string;
  readonly title: string;
  readonly body: string;
  readonly view_count: number;
  readonly published_at: IsoTimestamp;
}
