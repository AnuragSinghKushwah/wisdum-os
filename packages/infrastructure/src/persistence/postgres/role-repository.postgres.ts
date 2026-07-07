import { PermissionName, Role, RoleId, type RoleRepository, RoleName } from '@wisdum/domain';
import type { RoleSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { RoleRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: RoleRow): RoleSnapshot {
  return {
    id: RoleId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    name: RoleName.create(row.name),
    description: row.description,
    isSystem: row.is_system,
    permissions: row.permissions.map((permission) => PermissionName.create(permission)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `RoleRepository`. Row shape mirrors migration 0011. */
export class PostgresRoleRepository implements RoleRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: RoleId): Promise<Option<Role>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: RoleName): Promise<Option<Role>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name.value]);
  }

  async findAll(tenantId: TenantId): Promise<readonly Role[]> {
    const result = await this.pool.query<RoleRow>('SELECT * FROM roles WHERE tenant_id = $1', [
      tenantId,
    ]);
    return result.rows.map((row) => Role.reconstitute(toSnapshot(row)));
  }

  async save(role: Role): Promise<void> {
    await this.pool.query(
      `INSERT INTO roles (id, tenant_id, name, description, is_system, permissions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         permissions = EXCLUDED.permissions,
         updated_at = EXCLUDED.updated_at`,
      [
        role.getId().value(),
        role.tenantId,
        role.name.value,
        role.description,
        role.isSystem,
        role.permissions.map((permission) => permission.value),
        role.createdAt,
        role.updatedAt,
      ],
    );
  }

  async delete(role: Role): Promise<void> {
    await this.pool.query('DELETE FROM roles WHERE id = $1', [role.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<Role>> {
    const result = await this.pool.query<RoleRow>(`SELECT * FROM roles WHERE ${clause}`, params);
    const row = result.rows[0];
    return row === undefined ? none : some(Role.reconstitute(toSnapshot(row)));
  }
}
