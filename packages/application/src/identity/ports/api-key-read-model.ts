import type { TenantId } from '@wisdum/types';
import type { ApiKeyDto } from '../dto/api-key-dto.js';

export interface ApiKeyReadModel {
  listByTenant(tenantId: TenantId): Promise<readonly ApiKeyDto[]>;
}
