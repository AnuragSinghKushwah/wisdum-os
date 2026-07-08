import {
  DisplayName,
  Email,
  PasswordHash,
  RoleId,
  User,
  UserId,
  type UserRepository,
  UserStatus,
} from '@wisdum/domain';
import type { UserSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { UserRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: UserRow): UserSnapshot {
  return {
    id: UserId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    email: Email.create(row.email),
    displayName: DisplayName.create(row.display_name),
    passwordHash: row.password_hash !== null ? PasswordHash.create(row.password_hash) : undefined,
    status: UserStatus.create(row.status),
    roleIds: row.role_ids.map((id) => RoleId.create(id)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `UserRepository`. Row shape mirrors migration 0004. */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: UserId): Promise<Option<User>> {
    const result = await this.pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [
      id.value(),
    ]);
    const row = result.rows[0];
    return row === undefined ? none : some(User.reconstitute(toSnapshot(row)));
  }

  /** Beyond the write-side port: used by `UserReadModel` to list a tenant's users. */
  async listByTenant(tenantId: TenantId): Promise<readonly User[]> {
    const result = await this.pool.query<UserRow>('SELECT * FROM users WHERE tenant_id = $1', [
      tenantId,
    ]);
    return result.rows.map((row) => User.reconstitute(toSnapshot(row)));
  }

  async findByEmail(tenantId: TenantId, email: Email): Promise<Option<User>> {
    const result = await this.pool.query<UserRow>(
      'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email.value],
    );
    const row = result.rows[0];
    return row === undefined ? none : some(User.reconstitute(toSnapshot(row)));
  }

  async exists(id: UserId): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM users WHERE id = $1', [id.value()]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async save(user: User): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, tenant_id, email, display_name, password_hash, status, role_ids, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         password_hash = EXCLUDED.password_hash,
         status = EXCLUDED.status,
         role_ids = EXCLUDED.role_ids,
         updated_at = EXCLUDED.updated_at`,
      [
        user.getId().value(),
        user.tenantId,
        user.email.value,
        user.displayName.value,
        user.passwordHash?.value ?? null,
        user.status.value,
        user.roleIds.map((roleId) => roleId.value()),
        user.createdAt,
        user.updatedAt,
      ],
    );
  }

  async delete(user: User): Promise<void> {
    await this.pool.query('DELETE FROM users WHERE id = $1', [user.getId().value()]);
  }
}
