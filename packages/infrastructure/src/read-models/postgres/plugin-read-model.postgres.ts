import { PluginId } from '@wisdum/domain';
import type { PluginDto, PluginReadModel } from '@wisdum/application';
import { toPluginDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { PostgresPluginRepository } from '../../persistence/postgres/plugin-repository.postgres.js';

export class PostgresPluginReadModel implements PluginReadModel {
  constructor(private readonly repository: PostgresPluginRepository) {}

  async findById(pluginId: string): Promise<PluginDto | undefined> {
    const found = await this.repository.findById(PluginId.create(pluginId));
    return found.some ? toPluginDto(found.value) : undefined;
  }

  async listByTenant(tenantId: TenantId): Promise<readonly PluginDto[]> {
    const plugins = await this.repository.findAll(tenantId);
    return plugins.map(toPluginDto);
  }
}
