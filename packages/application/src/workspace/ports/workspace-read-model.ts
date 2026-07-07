import type { TenantId } from '@wisdum/types';
import type { WorkspaceDto } from '../dto/workspace-dto.js';

export interface WorkspaceReadModel {
  findById(workspaceId: string): Promise<WorkspaceDto | undefined>;
  listByOrganization(tenantId: TenantId, organizationId: string): Promise<readonly WorkspaceDto[]>;
}
