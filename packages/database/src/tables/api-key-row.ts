import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `api_keys` table. */
export interface ApiKeyRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly owner_id: UUID;
  readonly owner_type: string;
  readonly label: string;
  readonly key_hash: string;
  readonly scopes: readonly string[];
  readonly status: string;
  readonly expires_at: IsoTimestamp | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
