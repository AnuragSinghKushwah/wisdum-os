import type { PgPool } from '@wisdum/database';
import type { TenantDirectory } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';

interface TenantIdRow {
  readonly id: string;
}

/** Reads every row from `tenants` — the only table this adapter touches; see `TenantDirectory` for scope. */
export class PostgresTenantDirectory implements TenantDirectory {
  constructor(private readonly pool: PgPool) {}

  async listAllTenantIds(): Promise<readonly TenantId[]> {
    const result = await this.pool.query<TenantIdRow>('SELECT id FROM tenants ORDER BY created_at');
    return result.rows.map((row) => row.id as TenantId);
  }
}
