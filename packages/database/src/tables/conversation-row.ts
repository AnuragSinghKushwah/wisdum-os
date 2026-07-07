import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `conversations` table. */
export interface ConversationRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly provider: string;
  readonly model_name: string;
  readonly owner_id: UUID;
  readonly title: string | null;
  readonly status: string;
  readonly total_input_tokens: number;
  readonly total_output_tokens: number;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `conversation_messages` table. */
export interface ConversationMessageRow {
  readonly conversation_id: UUID;
  readonly message_index: number;
  readonly role: string;
  readonly content: string;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly created_at: IsoTimestamp;
}

/** Raw row shape of the `conversation_message_tool_calls` table. */
export interface ConversationMessageToolCallRow {
  readonly id: UUID;
  readonly conversation_id: UUID;
  readonly message_index: number;
  readonly tool_name: string;
  readonly arguments_json: string;
  readonly status: string;
  readonly result_json: string | null;
}
