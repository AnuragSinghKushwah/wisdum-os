import type { TenantId } from '@wisdum/types';
import type { PluginDto } from '../dto/plugin-dto.js';

export interface PluginReadModel {
  findById(pluginId: string): Promise<PluginDto | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly PluginDto[]>;
}
