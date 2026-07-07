import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `ai_providers` table. */
export interface AIProviderRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly display_name: string;
  readonly enabled: boolean;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
