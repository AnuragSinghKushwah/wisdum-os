import { PluginId } from '@wisdum/domain';
import type { PluginDto, PluginReadModel } from '@wisdum/application';
import { toPluginDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { InMemoryPluginRepository } from '../persistence/plugin-repository.js';

export class InMemoryPluginReadModel implements PluginReadModel {
  constructor(private readonly repository: InMemoryPluginRepository) {}

  async findById(tenantId: TenantId, pluginId: string): Promise<PluginDto | undefined> {
    const found = await this.repository.findById(PluginId.create(pluginId));
    return found.some && found.value.tenantId === tenantId ? toPluginDto(found.value) : undefined;
  }

  listByTenant(tenantId: TenantId): Promise<readonly PluginDto[]> {
    const dtos = this.repository
      .all()
      .filter((plugin) => plugin.tenantId === tenantId)
      .map(toPluginDto);
    return Promise.resolve(dtos);
  }
}
