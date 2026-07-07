import {
  AIProvider,
  AIProviderId,
  type AIProviderRepository,
  ProviderName,
} from '@wisdum/domain';
import type { AIProviderSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { AIProviderRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: AIProviderRow): AIProviderSnapshot {
  return {
    id: AIProviderId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: ProviderName.create(row.name),
    displayName: row.display_name,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `AIProviderRepository`. Row shape mirrors migration 0015. */
export class PostgresAIProviderRepository implements AIProviderRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: AIProviderId): Promise<Option<AIProvider>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: ProviderName): Promise<Option<AIProvider>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name.value]);
  }

  async findAll(tenantId: TenantId): Promise<readonly AIProvider[]> {
    const result = await this.pool.query<AIProviderRow>(
      'SELECT * FROM ai_providers WHERE tenant_id = $1',
      [tenantId],
    );
    return result.rows.map((row) => AIProvider.reconstitute(toSnapshot(row)));
  }

  async save(provider: AIProvider): Promise<void> {
    await this.pool.query(
      `INSERT INTO ai_providers (id, tenant_id, name, display_name, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         enabled = EXCLUDED.enabled,
         updated_at = EXCLUDED.updated_at`,
      [
        provider.getId().value(),
        provider.tenantId,
        provider.name.value,
        provider.displayName,
        provider.enabled,
        provider.createdAt,
        provider.updatedAt,
      ],
    );
  }

  async delete(provider: AIProvider): Promise<void> {
    await this.pool.query('DELETE FROM ai_providers WHERE id = $1', [provider.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<AIProvider>> {
    const result = await this.pool.query<AIProviderRow>(
      `SELECT * FROM ai_providers WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(AIProvider.reconstitute(toSnapshot(row)));
  }
}
