import type { TenantId } from '@wisdum/types';
import type { WorkspaceDto } from '../dto/workspace-dto.js';

export interface WorkspaceReadModel {
  /** Resolves to `undefined` for a resource that does not exist *in this tenant*. */
  findById(tenantId: TenantId, workspaceId: string): Promise<WorkspaceDto | undefined>;
  listByOrganization(tenantId: TenantId, organizationId: string): Promise<readonly WorkspaceDto[]>;
  listByTenant(tenantId: TenantId): Promise<readonly WorkspaceDto[]>;
}
