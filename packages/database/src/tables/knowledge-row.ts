import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `knowledge` table. */
export interface KnowledgeRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly type: string;
  readonly status: string;
  readonly visibility: string;
  readonly source_kind: string;
  readonly source_uri: string | null;
  readonly version: number;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
  readonly processing_started_at: IsoTimestamp | null;
  readonly processed_at: IsoTimestamp | null;
}

/** Raw row shape of the `knowledge_labels` table. */
export interface KnowledgeLabelRow {
  readonly knowledge_id: UUID;
  readonly label: string;
}

/** Raw row shape of the `knowledge_content_references` table. */
export interface KnowledgeContentReferenceRow {
  readonly id: UUID;
  readonly knowledge_id: UUID;
  readonly reference: string;
  readonly mime_type: string | null;
  readonly position: number;
}
