import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `documents` table. */
export interface DocumentRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly content: string;
  readonly mime_type: string;
  readonly language: string;
  readonly encoding: string;
  /** `bigint` in Postgres — the `pg` driver returns it as a string. */
  readonly size_bytes: string;
  readonly content_hash_algorithm: string;
  readonly content_hash_digest: string;
  readonly status: string;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
