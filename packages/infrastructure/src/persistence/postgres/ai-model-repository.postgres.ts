import {
  AIModel,
  AIModelId,
  type AIModelRepository,
  CompletionModel,
  EmbeddingModel,
  ModelReference,
} from '@wisdum/domain';
import type { AIModelKind, AIModelSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { AIModelRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: AIModelRow): AIModelSnapshot {
  return {
    id: AIModelId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    reference: ModelReference.create({ provider: row.provider, modelName: row.model_name }),
    kind: row.kind as AIModelKind,
    completionProfile:
      row.context_window_tokens !== null && row.max_output_tokens !== null
        ? CompletionModel.create({
            contextWindowTokens: row.context_window_tokens,
            maxOutputTokens: row.max_output_tokens,
            supportsTools: row.supports_tools ?? undefined,
          })
        : undefined,
    embeddingProfile:
      row.embedding_dimensions !== null && row.embedding_max_input_tokens !== null
        ? EmbeddingModel.create({
            dimensions: row.embedding_dimensions,
            maxInputTokens: row.embedding_max_input_tokens,
          })
        : undefined,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `AIModelRepository`. Row shape mirrors migration 0016. */
export class PostgresAIModelRepository implements AIModelRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: AIModelId): Promise<Option<AIModel>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByReference(
    tenantId: TenantId,
    reference: ModelReference,
  ): Promise<Option<AIModel>> {
    return this.findOneWhere('tenant_id = $1 AND provider = $2 AND model_name = $3', [
      tenantId,
      reference.provider.value,
      reference.modelName,
    ]);
  }

  async findByKind(tenantId: TenantId, kind: AIModelKind): Promise<readonly AIModel[]> {
    const result = await this.pool.query<AIModelRow>(
      'SELECT * FROM ai_models WHERE tenant_id = $1 AND kind = $2',
      [tenantId, kind],
    );
    return result.rows.map((row) => AIModel.reconstitute(toSnapshot(row)));
  }

  async save(model: AIModel): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_models (
         id, tenant_id, provider, model_name, kind,
         context_window_tokens, max_output_tokens, supports_tools,
         embedding_dimensions, embedding_max_input_tokens,
         enabled, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         updated_at = EXCLUDED.updated_at`,
      [
        model.getId().value(),
        model.tenantId,
        model.reference.provider.value,
        model.reference.modelName,
        model.kind,
        model.completionProfile?.contextWindowTokens ?? null,
        model.completionProfile?.maxOutputTokens ?? null,
        model.completionProfile?.supportsTools ?? null,
        model.embeddingProfile?.dimensions ?? null,
        model.embeddingProfile?.maxInputTokens ?? null,
        model.enabled,
        model.createdAt,
        model.updatedAt,
      ],
    );
  }

  async delete(model: AIModel): Promise<void> {
    await this.pool.query('DELETE FROM ai_models WHERE id = $1', [model.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<AIModel>> {
    const result = await this.pool.query<AIModelRow>(
      `SELECT * FROM ai_models WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(AIModel.reconstitute(toSnapshot(row)));
  }
}
