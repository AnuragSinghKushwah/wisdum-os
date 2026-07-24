import type { IsoTimestamp, UUID } from '@wisdum/types';

export interface AgentTaskRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly agent_type: string;
  readonly status: string;
  readonly payload: any;
  readonly result?: any | null;
  readonly error?: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
