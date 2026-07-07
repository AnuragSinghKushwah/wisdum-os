import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `ai_models` table. */
export interface AIModelRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly provider: string;
  readonly model_name: string;
  readonly kind: string;
  readonly context_window_tokens: number | null;
  readonly max_output_tokens: number | null;
  readonly supports_tools: boolean | null;
  readonly embedding_dimensions: number | null;
  readonly embedding_max_input_tokens: number | null;
  readonly enabled: boolean;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
