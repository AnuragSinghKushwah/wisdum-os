import {
  PromptBody,
  PromptTemplate,
  PromptTemplateId,
  type PromptTemplateRepository,
} from '@wisdum/domain';
import type { PromptTemplateSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { PromptTemplateRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: PromptTemplateRow): PromptTemplateSnapshot {
  return {
    id: PromptTemplateId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: row.name,
    description: row.description,
    body: PromptBody.create(row.body),
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `PromptTemplateRepository`. Row shape mirrors migration 0009. */
export class PostgresPromptTemplateRepository implements PromptTemplateRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: PromptTemplateId): Promise<Option<PromptTemplate>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: string): Promise<Option<PromptTemplate>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name]);
  }

  async findAll(tenantId: TenantId): Promise<readonly PromptTemplate[]> {
    const result = await this.pool.query<PromptTemplateRow>(
      'SELECT * FROM prompt_templates WHERE tenant_id = $1',
      [tenantId],
    );
    return result.rows.map((row) => PromptTemplate.reconstitute(toSnapshot(row)));
  }

  async save(template: PromptTemplate): Promise<void> {
    await this.pool.query(
      `INSERT INTO prompt_templates (
         id, tenant_id, name, description, body, variables, revision, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         body = EXCLUDED.body,
         variables = EXCLUDED.variables,
         revision = EXCLUDED.revision,
         updated_at = EXCLUDED.updated_at`,
      [
        template.getId().value(),
        template.tenantId,
        template.name,
        template.description,
        template.body.value,
        template.body.variables,
        template.revision,
        template.createdAt,
        template.updatedAt,
      ],
    );
  }

  async delete(template: PromptTemplate): Promise<void> {
    await this.pool.query('DELETE FROM prompt_templates WHERE id = $1', [
      template.getId().value(),
    ]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<PromptTemplate>> {
    const result = await this.pool.query<PromptTemplateRow>(
      `SELECT * FROM prompt_templates WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(PromptTemplate.reconstitute(toSnapshot(row)));
  }
}
