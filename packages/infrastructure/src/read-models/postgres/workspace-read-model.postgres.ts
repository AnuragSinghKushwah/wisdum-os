import { WorkspaceId } from '@wisdum/domain';
import type { WorkspaceDto, WorkspaceReadModel } from '@wisdum/application';
import { toWorkspaceDto } from '@wisdum/application';
import type { TenantId, UUID } from '@wisdum/types';
import type { PostgresWorkspaceRepository } from '../../persistence/postgres/workspace-repository.postgres.js';

export class PostgresWorkspaceReadModel implements WorkspaceReadModel {
  constructor(private readonly repository: PostgresWorkspaceRepository) {}

  async findById(workspaceId: string): Promise<WorkspaceDto | undefined> {
    const found = await this.repository.findById(WorkspaceId.create(workspaceId));
    return found.some ? toWorkspaceDto(found.value) : undefined;
  }

  async listByOrganization(
    tenantId: TenantId,
    organizationId: string,
  ): Promise<readonly WorkspaceDto[]> {
    const workspaces = await this.repository.findByOrganization(
      tenantId,
      organizationId as UUID,
    );
    return workspaces.map(toWorkspaceDto);
  }
}
