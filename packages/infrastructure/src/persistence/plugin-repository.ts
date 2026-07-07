import type {
  Plugin,
  PluginCapability,
  PluginId,
  PluginName,
  PluginRepository,
} from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryPluginRepository
  extends InMemoryRepository<PluginId, Plugin>
  implements PluginRepository
{
  findByName(tenantId: TenantId, name: PluginName): Promise<Option<Plugin>> {
    const found = this.values().find(
      (plugin) => plugin.tenantId === tenantId && plugin.manifest.name.equals(name),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findByCapability(tenantId: TenantId, capability: PluginCapability): Promise<readonly Plugin[]> {
    return Promise.resolve(
      this.values().filter(
        (plugin) => plugin.tenantId === tenantId && plugin.providesCapability(capability),
      ),
    );
  }

  findAll(tenantId: TenantId): Promise<readonly Plugin[]> {
    return Promise.resolve(this.values().filter((plugin) => plugin.tenantId === tenantId));
  }
}
