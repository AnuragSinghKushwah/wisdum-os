import {
  Plugin,
  PluginCapability,
  PluginDependency,
  PluginId,
  PluginManifest,
  PluginName,
  PluginPermission,
  type PluginRepository,
  PluginStatus,
  PluginVersion,
} from '@wisdum/domain';
import type { PluginSnapshot } from '@wisdum/domain';
import type { PgPool } from '@wisdum/database';
import type { PluginRow } from '@wisdum/database';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';

function toSnapshot(row: PluginRow): PluginSnapshot {
  return {
    id: PluginId.create(row.id),
    tenantId: row.tenant_id as unknown as TenantId,
    manifest: PluginManifest.create({
      name: PluginName.create(row.name),
      version: PluginVersion.create(row.version),
      displayName: row.display_name,
      description: row.description,
      capabilities: row.capabilities.map((capability) => PluginCapability.create(capability)),
      permissions: row.permissions.map((permission) => PluginPermission.create(permission)),
      dependencies: row.dependencies.map((dependency) =>
        PluginDependency.create({ pluginName: dependency.pluginName, range: dependency.range }),
      ),
    }),
    status: PluginStatus.create(row.status),
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}

/** PostgreSQL-backed `PluginRepository`. Row shape mirrors migration 0007. */
export class PostgresPluginRepository implements PluginRepository {
  constructor(private readonly pool: PgPool) {}

  async findById(id: PluginId): Promise<Option<Plugin>> {
    return this.findOneWhere('id = $1', [id.value()]);
  }

  async findByName(tenantId: TenantId, name: PluginName): Promise<Option<Plugin>> {
    return this.findOneWhere('tenant_id = $1 AND name = $2', [tenantId, name.value]);
  }

  async findByCapability(
    tenantId: TenantId,
    capability: PluginCapability,
  ): Promise<readonly Plugin[]> {
    const result = await this.pool.query<PluginRow>(
      'SELECT * FROM plugins WHERE tenant_id = $1 AND $2 = ANY(capabilities)',
      [tenantId, capability.value],
    );
    return result.rows.map((row) => Plugin.reconstitute(toSnapshot(row)));
  }

  async findAll(tenantId: TenantId): Promise<readonly Plugin[]> {
    const result = await this.pool.query<PluginRow>(
      'SELECT * FROM plugins WHERE tenant_id = $1',
      [tenantId],
    );
    return result.rows.map((row) => Plugin.reconstitute(toSnapshot(row)));
  }

  async save(plugin: Plugin): Promise<void> {
    await this.pool.query(
      `INSERT INTO plugins (
         id, tenant_id, name, version, display_name, description,
         capabilities, permissions, dependencies, status, installed_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         version = EXCLUDED.version,
         display_name = EXCLUDED.display_name,
         description = EXCLUDED.description,
         capabilities = EXCLUDED.capabilities,
         permissions = EXCLUDED.permissions,
         dependencies = EXCLUDED.dependencies,
         status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
      [
        plugin.getId().value(),
        plugin.tenantId,
        plugin.manifest.name.value,
        plugin.manifest.version.toString(),
        plugin.manifest.displayName,
        plugin.manifest.description,
        plugin.manifest.capabilities.map((capability) => capability.value),
        plugin.manifest.permissions.map((permission) => permission.value),
        JSON.stringify(
          plugin.manifest.dependencies.map((dependency) => ({
            pluginName: dependency.pluginName.value,
            range: dependency.range,
          })),
        ),
        plugin.status.value,
        plugin.installedAt,
        plugin.updatedAt,
      ],
    );
  }

  async delete(plugin: Plugin): Promise<void> {
    await this.pool.query('DELETE FROM plugins WHERE id = $1', [plugin.getId().value()]);
  }

  private async findOneWhere(clause: string, params: unknown[]): Promise<Option<Plugin>> {
    const result = await this.pool.query<PluginRow>(
      `SELECT * FROM plugins WHERE ${clause}`,
      params,
    );
    const row = result.rows[0];
    return row === undefined ? none : some(Plugin.reconstitute(toSnapshot(row)));
  }
}
