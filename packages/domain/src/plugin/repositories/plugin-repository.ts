import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Plugin } from '../entities/plugin.js';
import type { PluginCapability } from '../value-objects/plugin-capability.js';
import type { PluginId } from '../value-objects/plugin-id.js';
import type { PluginName } from '../value-objects/plugin-name.js';

/**
 * Persistence port of the Plugin aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007). Capability lookup
 * backs the kernel's capability resolver.
 */
export interface PluginRepository extends Repository<Plugin> {
  findById(id: PluginId): Promise<Option<Plugin>>;
  /** A plugin name is installed at most once per tenant. */
  findByName(tenantId: TenantId, name: PluginName): Promise<Option<Plugin>>;
  findByCapability(tenantId: TenantId, capability: PluginCapability): Promise<readonly Plugin[]>;
  findAll(tenantId: TenantId): Promise<readonly Plugin[]>;
  save(plugin: Plugin): Promise<void>;
  delete(plugin: Plugin): Promise<void>;
}
