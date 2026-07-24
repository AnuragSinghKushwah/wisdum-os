import type { ApiKeyDto, ApiKeyReadModel } from '@wisdum/application';
import type { PgPool } from '@wisdum/database';
import type { TenantId } from '@wisdum/types';

export class PostgresApiKeyReadModel implements ApiKeyReadModel {
  constructor(private readonly pool: PgPool) {}

  async listByTenant(tenantId: TenantId): Promise<readonly ApiKeyDto[]> {
    const result = await this.pool.query<{
      id: string;
      label: string;
      status: string;
      expires_at: Date | null;
      created_at: Date;
    }>(
      'SELECT id, label, status, expires_at, created_at FROM api_keys WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      label: row.label,
      status: row.status as 'active' | 'revoked',
      expiresAt: row.expires_at?.toISOString(),
      createdAt: row.created_at.toISOString(),
    }));
  }
}
