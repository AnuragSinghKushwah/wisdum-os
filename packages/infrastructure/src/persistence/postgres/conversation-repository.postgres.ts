import { randomUUID } from 'node:crypto';
import {
  Conversation,
  ConversationId,
  ConversationMessage,
  type ConversationRepository,
  ModelReference,
  TokenUsage,
  ToolCall,
} from '@wisdum/domain';
import type { ConversationSnapshot, MessageRole, ToolCallStatusValue } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type {
  ConversationMessageRow,
  ConversationMessageToolCallRow,
  ConversationRow,
} from '@wisdum/database';
import type { Option, TenantId, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(
  row: ConversationRow,
  messages: readonly ConversationMessageRow[],
  toolCalls: readonly ConversationMessageToolCallRow[],
): ConversationSnapshot {
  const toolCallsByMessageIndex = new Map<number, ConversationMessageToolCallRow[]>();
  for (const toolCall of toolCalls) {
    const existing = toolCallsByMessageIndex.get(toolCall.message_index) ?? [];
    existing.push(toolCall);
    toolCallsByMessageIndex.set(toolCall.message_index, existing);
  }

  return {
    id: ConversationId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    model: ModelReference.create({ provider: row.provider, modelName: row.model_name }),
    ownerId: row.owner_id as UUID,
    title: row.title ?? undefined,
    status: row.status as ConversationSnapshot['status'],
    // pg returns `bigint` columns as strings to avoid silent precision loss.
    totalUsage: TokenUsage.create({
      inputTokens: Number(row.total_input_tokens),
      outputTokens: Number(row.total_output_tokens),
    }),
    messages: [...messages]
      .sort((a, b) => a.message_index - b.message_index)
      .map((message) =>
        ConversationMessage.create({
          role: message.role as MessageRole,
          content: message.content,
          createdAt: message.created_at,
          toolCalls: (toolCallsByMessageIndex.get(message.message_index) ?? []).map((toolCall) =>
            ToolCall.create({
              toolName: toolCall.tool_name,
              argumentsJson: toolCall.arguments_json,
              status: toolCall.status as ToolCallStatusValue,
              resultJson: toolCall.result_json ?? undefined,
            }),
          ),
          usage:
            message.input_tokens !== null && message.output_tokens !== null
              ? TokenUsage.create({
                  inputTokens: Number(message.input_tokens),
                  outputTokens: Number(message.output_tokens),
                })
              : undefined,
        }),
      ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ConversationRepository`. Row shapes mirror migration 0008. */
export class PostgresConversationRepository implements ConversationRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ConversationId): Promise<Option<Conversation>> {
    const result = await this.pool.query<ConversationRow>(
      'SELECT * FROM conversations WHERE id = $1',
      [id.value()],
    );
    const row = result.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  async findByOwner(tenantId: TenantId, ownerId: UUID): Promise<readonly Conversation[]> {
    const result = await this.pool.query<ConversationRow>(
      'SELECT * FROM conversations WHERE tenant_id = $1 AND owner_id = $2',
      [tenantId, ownerId],
    );
    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async save(conversation: Conversation): Promise<void> {
    const client = await this.pool.connect();
    const id = conversation.getId().value();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO conversations (
           id, tenant_id, provider, model_name, owner_id, title, status,
           total_input_tokens, total_output_tokens, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           status = EXCLUDED.status,
           total_input_tokens = EXCLUDED.total_input_tokens,
           total_output_tokens = EXCLUDED.total_output_tokens,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          conversation.tenantId,
          conversation.model.provider.value,
          conversation.model.modelName,
          conversation.ownerId,
          conversation.title ?? null,
          conversation.status,
          conversation.totalUsage.inputTokens,
          conversation.totalUsage.outputTokens,
          conversation.createdAt,
          conversation.updatedAt,
        ],
      );

      await client.query('DELETE FROM conversation_messages WHERE conversation_id = $1', [id]);
      for (const [messageIndex, message] of conversation.messages.entries()) {
        await client.query(
          `INSERT INTO conversation_messages (
             conversation_id, message_index, role, content, input_tokens, output_tokens, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            id,
            messageIndex,
            message.role,
            message.content,
            message.usage?.inputTokens ?? null,
            message.usage?.outputTokens ?? null,
            message.createdAt,
          ],
        );
        for (const toolCall of message.toolCalls) {
          await client.query(
            `INSERT INTO conversation_message_tool_calls (
               id, conversation_id, message_index, tool_name, arguments_json, status, result_json
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              randomUUID(),
              id,
              messageIndex,
              toolCall.toolName,
              toolCall.argumentsJson,
              toolCall.status,
              toolCall.resultJson ?? null,
            ],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(conversation: Conversation): Promise<void> {
    await this.pool.query('DELETE FROM conversations WHERE id = $1', [
      conversation.getId().value(),
    ]);
  }

  private async hydrate(row: ConversationRow): Promise<Conversation> {
    const [messages, toolCalls] = await Promise.all([
      this.pool.query<ConversationMessageRow>(
        'SELECT * FROM conversation_messages WHERE conversation_id = $1',
        [row.id],
      ),
      this.pool.query<ConversationMessageToolCallRow>(
        'SELECT * FROM conversation_message_tool_calls WHERE conversation_id = $1',
        [row.id],
      ),
    ]);
    return Conversation.reconstitute(toSnapshot(row, messages.rows, toolCalls.rows));
  }
}
