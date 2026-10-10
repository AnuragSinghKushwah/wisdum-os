import type { TenantId } from '@wisdum/types';
import type { OrganizationDto } from '../dto/organization-dto.js';

export interface OrganizationReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, organizationId: string): Promise<OrganizationDto | undefined>;
}
