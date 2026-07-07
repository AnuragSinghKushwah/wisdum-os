import { Permission, PermissionId, PermissionName, type PermissionRepository } from '@wisdum/domain';
import type { PermissionSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { PermissionRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: PermissionRow): PermissionSnapshot {
  return {
    id: PermissionId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: PermissionName.create(row.name),
    description: row.description,
    createdAt: row.created_at,
  };
}

/** PostgreSQL-backed `PermissionRepository`. Row shape mirrors migration 0012. */
export class PostgresPermissionRepository implements PermissionRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: PermissionId): Promise<Option<Permission>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: PermissionName): Promise<Option<Permission>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name.value]);
  }

  async findAll(tenantId: TenantId): Promise<readonly Permission[]> {
    const result = await this.pool.query<PermissionRow>(
      'SELECT * FROM permissions WHERE tenant_id = $1',
      [tenantId],
    );
    return result.rows.map((row) => Permission.reconstitute(toSnapshot(row)));
  }

  async save(permission: Permission): Promise<void> {
    await this.pool.query(
      `INSERT INTO permissions (id, tenant_id, name, description, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description`,
      [
        permission.getId().value(),
        permission.tenantId,
        permission.name.value,
        permission.description,
        permission.createdAt,
      ],
    );
  }

  async delete(permission: Permission): Promise<void> {
    await this.pool.query('DELETE FROM permissions WHERE id = $1', [permission.getId().value()]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<Permission>> {
    const result = await this.pool.query<PermissionRow>(
      `SELECT * FROM permissions WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(Permission.reconstitute(toSnapshot(row)));
  }
}
