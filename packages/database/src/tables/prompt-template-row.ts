import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `prompt_templates` table. */
export interface PromptTemplateRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly variables: readonly string[];
  readonly revision: number;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}
