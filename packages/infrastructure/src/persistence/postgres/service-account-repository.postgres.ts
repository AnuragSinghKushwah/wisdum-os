import {
  DisplayName,
  RoleId,
  ServiceAccount,
  ServiceAccountId,
  type ServiceAccountRepository,
} from '@wisdum/domain';
import type { ServiceAccountSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ServiceAccountRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ServiceAccountRow): ServiceAccountSnapshot {
  return {
    id: ServiceAccountId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    displayName: DisplayName.create(row.display_name),
    description: row.description,
    status: row.status as ServiceAccountSnapshot['status'],
    roleIds: row.role_ids.map((id) => RoleId.create(id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ServiceAccountRepository`. Row shape mirrors migration 0014. */
export class PostgresServiceAccountRepository implements ServiceAccountRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ServiceAccountId): Promise<Option<ServiceAccount>> {
    const result = await this.pool.query<ServiceAccountRow>(
      'SELECT * FROM service_accounts WHERE id = $1',
      [id.value()],
    );
    const row = result.rows[0];
    return row === undefined ? none : some(ServiceAccount.reconstitute(toSnapshot(row)));
  }

  async findAll(tenantId: TenantId): Promise<readonly ServiceAccount[]> {
    const result = await this.pool.query<ServiceAccountRow>(
      'SELECT * FROM service_accounts WHERE tenant_id = $1',
      [tenantId],
    );
    return result.rows.map((row) => ServiceAccount.reconstitute(toSnapshot(row)));
  }

  async save(account: ServiceAccount): Promise<void> {
    await this.pool.query(
      `INSERT INTO service_accounts (
         id, tenant_id, display_name, description, status, role_ids, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         role_ids = EXCLUDED.role_ids,
         updated_at = EXCLUDED.updated_at`,
      [
        account.getId().value(),
        account.tenantId,
        account.displayName.value,
        account.description,
        account.status,
        account.roleIds.map((roleId) => roleId.value()),
        account.createdAt,
        account.updatedAt,
      ],
    );
  }

  async delete(account: ServiceAccount): Promise<void> {
    await this.pool.query('DELETE FROM service_accounts WHERE id = $1', [
      account.getId().value(),
    ]);
  }
}
