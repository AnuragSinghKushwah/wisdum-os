import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `roles` table. */
export interface RoleRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly description: string;
  readonly is_system: boolean;
  readonly permissions: readonly string[];
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
