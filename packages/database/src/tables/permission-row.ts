import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `permissions` table. */
export interface PermissionRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly description: string;
  readonly created_at: IsoTimestamp;
}
