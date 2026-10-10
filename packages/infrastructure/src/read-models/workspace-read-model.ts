import { WorkspaceId } from '@wisdum/domain';
import type { WorkspaceDto, WorkspaceReadModel } from '@wisdum/application';
import { toWorkspaceDto } from '@wisdum/application';
import type { TenantId, UUID } from '@wisdum/types';
import type { InMemoryWorkspaceRepository } from '../persistence/workspace-repository.js';

export class InMemoryWorkspaceReadModel implements WorkspaceReadModel {
  constructor(private readonly repository: InMemoryWorkspaceRepository) {}

  async findById(tenantId: TenantId, workspaceId: string): Promise<WorkspaceDto | undefined> {
    const found = await this.repository.findById(WorkspaceId.create(workspaceId));
    return found.some && found.value.tenantId === tenantId
      ? toWorkspaceDto(found.value)
      : undefined;
  }

  listByOrganization(tenantId: TenantId, organizationId: string): Promise<readonly WorkspaceDto[]> {
    const dtos = this.repository
      .all()
      .filter(
        (workspace) =>
          workspace.tenantId === tenantId && workspace.organizationId === (organizationId as UUID),
      )
      .map(toWorkspaceDto);
    return Promise.resolve(dtos);
  }

  listByTenant(tenantId: TenantId): Promise<readonly WorkspaceDto[]> {
    const dtos = this.repository
      .all()
      .filter((workspace) => workspace.tenantId === tenantId)
      .map(toWorkspaceDto);
    return Promise.resolve(dtos);
  }
}
