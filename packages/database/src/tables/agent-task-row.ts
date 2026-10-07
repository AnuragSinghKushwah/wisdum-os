import type { IsoTimestamp, UUID } from '@wisdum/types';

export interface AgentTaskRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly agent_type: string;
  readonly status: string;
  readonly payload: unknown;
  readonly result?: unknown | null;
  readonly error?: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
