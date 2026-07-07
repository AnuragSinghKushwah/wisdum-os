import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `service_accounts` table. */
export interface ServiceAccountRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly display_name: string;
  readonly description: string;
  readonly status: string;
  readonly role_ids: readonly UUID[];
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
