import type { PgPool } from '@wisdum/database';
import type {
  WorkspaceFeatureFlagRow,
  WorkspaceMemberRow,
  WorkspaceRow,
  WorkspaceSettingRow,
} from '@wisdum/database';
import {
  FeatureFlags,
  Workspace,
  WorkspaceId,
  WorkspaceLimits,
  WorkspaceMember,
  WorkspaceName,
  type WorkspaceRepository,
  WorkspaceSettings,
  WorkspaceSlug,
  WorkspaceStatus,
} from '@wisdum/domain';
import type { WorkspaceMemberRole, WorkspaceSettingValue, WorkspaceSnapshot } from '@wisdum/domain';
import type { Option, TenantId, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(
  row: WorkspaceRow,
  members: readonly WorkspaceMemberRow[],
  settings: readonly WorkspaceSettingRow[],
  featureFlags: readonly WorkspaceFeatureFlagRow[],
): WorkspaceSnapshot {
  return {
    id: WorkspaceId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    organizationId: row.organization_id as UUID,
    name: WorkspaceName.create(row.name),
    slug: WorkspaceSlug.create(row.slug),
    status: WorkspaceStatus.create(row.status),
    members: members.map((member) =>
      WorkspaceMember.create({
        userId: member.user_id as UUID,
        role: member.role as WorkspaceMemberRole,
        joinedAt: member.joined_at,
      }),
    ),
    settings: WorkspaceSettings.create(
      Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value as WorkspaceSettingValue]),
      ),
    ),
    limits: WorkspaceLimits.create({
      maxMembers: row.max_members ?? undefined,
      maxKnowledgeAssets: row.max_knowledge_assets ?? undefined,
      // pg returns `bigint` columns as strings to avoid silent precision loss.
      maxStorageBytes: row.max_storage_bytes !== null ? Number(row.max_storage_bytes) : undefined,
    }),
    featureFlags: FeatureFlags.create(
      Object.fromEntries(featureFlags.map((flag) => [flag.flag, flag.enabled])),
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `WorkspaceRepository`. Row shapes mirror migration 0003. */
export class PostgresWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: WorkspaceId): Promise<Option<Workspace>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findBySlug(tenantId: TenantId, slug: WorkspaceSlug): Promise<Option<Workspace>> {
    return this.findOneWhere('tenant_id = $1 AND slug = $2', [tenantId, slug.value]);
  }

  async findByOrganization(
    tenantId: TenantId,
    organizationId: UUID,
  ): Promise<readonly Workspace[]> {
    const rows = await this.pool.query<WorkspaceRow>(
      'SELECT * FROM workspaces WHERE tenant_id = $1 AND organization_id = $2',
      [tenantId, organizationId],
    );
    return Promise.all(rows.rows.map((row) => this.hydrate(row)));
  }

  async findByTenant(tenantId: TenantId): Promise<readonly Workspace[]> {
    const rows = await this.pool.query<WorkspaceRow>(
      'SELECT * FROM workspaces WHERE tenant_id = $1',
      [tenantId],
    );
    return Promise.all(rows.rows.map((row) => this.hydrate(row)));
  }

  async exists(id: WorkspaceId): Promise<boolean> {
    const result = await this.pool.query('SELECT 1 FROM workspaces WHERE id = $1', [id.value()]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async save(workspace: Workspace): Promise<void> {
    const client = await this.pool.connect();
    const id = workspace.getId().value();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO workspaces (
           id, tenant_id, organization_id, name, slug, status,
           max_members, max_knowledge_assets, max_storage_bytes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           status = EXCLUDED.status,
           max_members = EXCLUDED.max_members,
           max_knowledge_assets = EXCLUDED.max_knowledge_assets,
           max_storage_bytes = EXCLUDED.max_storage_bytes,
           updated_at = EXCLUDED.updated_at`,
        [
          id,
          workspace.tenantId,
          workspace.organizationId,
          workspace.name.value,
          workspace.slug.value,
          workspace.status.value,
          workspace.limits.maxMembers ?? null,
          workspace.limits.maxKnowledgeAssets ?? null,
          workspace.limits.maxStorageBytes ?? null,
          workspace.createdAt,
          workspace.updatedAt,
        ],
      );

      await client.query('DELETE FROM workspace_members WHERE workspace_id = $1', [id]);
      for (const member of workspace.members) {
        await client.query(
          `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4)`,
          [id, member.userId, member.role, member.joinedAt],
        );
      }

      await client.query('DELETE FROM workspace_settings WHERE workspace_id = $1', [id]);
      for (const [key, value] of Object.entries(workspace.settings.toRecord())) {
        await client.query(
          'INSERT INTO workspace_settings (workspace_id, key, value) VALUES ($1, $2, $3)',
          [id, key, JSON.stringify(value)],
        );
      }

      await client.query('DELETE FROM workspace_feature_flags WHERE workspace_id = $1', [id]);
      for (const [flag, enabled] of Object.entries(workspace.featureFlags.toRecord())) {
        await client.query(
          'INSERT INTO workspace_feature_flags (workspace_id, flag, enabled) VALUES ($1, $2, $3)',
          [id, flag, enabled],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(workspace: Workspace): Promise<void> {
    await this.pool.query('DELETE FROM workspaces WHERE id = $1', [workspace.getId().value()]);
  }

  private async findOneWhere(
    clause: string,
    params: unknown[],
  ): Promise<Option<Workspace>> {
    const result = await this.pool.query<WorkspaceRow>(
      `SELECT * FROM workspaces WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    if (row === undefined) return none;
    return some(await this.hydrate(row));
  }

  private async hydrate(row: WorkspaceRow): Promise<Workspace> {
    const [members, settings, featureFlags] = await Promise.all([
      this.pool.query<WorkspaceMemberRow>(
        'SELECT * FROM workspace_members WHERE workspace_id = $1',
        [row.id],
      ),
      this.pool.query<WorkspaceSettingRow>(
        'SELECT * FROM workspace_settings WHERE workspace_id = $1',
        [row.id],
      ),
      this.pool.query<WorkspaceFeatureFlagRow>(
        'SELECT * FROM workspace_feature_flags WHERE workspace_id = $1',
        [row.id],
      ),
    ]);
    return Workspace.reconstitute(
      toSnapshot(row, members.rows, settings.rows, featureFlags.rows),
    );
  }
}
