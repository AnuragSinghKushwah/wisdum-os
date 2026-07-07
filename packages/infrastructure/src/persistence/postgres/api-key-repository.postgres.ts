import {
  ApiKey,
  ApiKeyId,
  type ApiKeyRepository,
  PasswordHash,
  PermissionName,
} from '@wisdum/domain';
import type { ApiKeyOwnerType, ApiKeySnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { ApiKeyRow } from '@wisdum/database';
import type { Option, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: ApiKeyRow): ApiKeySnapshot {
  return {
    id: ApiKeyId.create(row.id),
    tenantId: row.tenant_id as unknown as ApiKeySnapshot['tenantId'],
    ownerId: row.owner_id as UUID,
    ownerType: row.owner_type as ApiKeyOwnerType,
    label: row.label,
    keyHash: PasswordHash.create(row.key_hash),
    scopes: row.scopes.map((scope) => PermissionName.create(scope)),
    status: row.status as ApiKeySnapshot['status'],
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `ApiKeyRepository`. Row shape mirrors migration 0013. */
export class PostgresApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: ApiKeyId): Promise<Option<ApiKey>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByKeyHash(keyHash: PasswordHash): Promise<Option<ApiKey>> {
    return this.findOneWhere('key_hash = $1', [keyHash.value]);
  }

  async save(apiKey: ApiKey): Promise<void> {
    await this.pool.query(
      `INSERT INTO api_keys (
         id, tenant_id, owner_id, owner_type, label, key_hash, scopes, status,
         expires_at, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         scopes = EXCLUDED.scopes,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        apiKey.getId().value(),
        apiKey.tenantId,
        apiKey.ownerId,
        apiKey.ownerType,
        apiKey.label,
        apiKey.keyHash.value,
        apiKey.scopes.map((scope) => scope.value),
        apiKey.status,
        apiKey.expiresAt ?? null,
        apiKey.createdAt,
        apiKey.updatedAt,
      ],
    );
  }

  async delete(apiKey: ApiKey): Promise<void> {
    await this.pool.query('DELETE FROM api_keys WHERE id = $1', [apiKey.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<ApiKey>> {
    const result = await this.pool.query<ApiKeyRow>(
      `SELECT * FROM api_keys WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(ApiKey.reconstitute(toSnapshot(row)));
  }
}
