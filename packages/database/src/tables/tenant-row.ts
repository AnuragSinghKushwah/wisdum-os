import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `tenants` table. */
export interface TenantRow {
  readonly id: UUID;
  readonly slug: string;
  readonly name: string;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
