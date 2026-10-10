import type { TenantId } from '@wisdum/types';
import type { PluginDto } from '../dto/plugin-dto.js';

export interface PluginReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, pluginId: string): Promise<PluginDto | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly PluginDto[]>;
}
