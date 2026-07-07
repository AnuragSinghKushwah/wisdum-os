import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `users` table. */
export interface UserRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly email: string;
  readonly display_name: string;
  readonly password_hash: string | null;
  readonly status: string;
  readonly role_ids: readonly UUID[];
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
