import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { WorkspaceDto } from '../dto/workspace-dto.js';
import type { WorkspaceReadModel } from '../ports/workspace-read-model.js';
import type { GetWorkspaceQuery } from '../queries/get-workspace-query.js';

export class GetWorkspaceHandler implements QueryHandler<GetWorkspaceQuery, WorkspaceDto> {
  constructor(private readonly reads: WorkspaceReadModel) {}

  async execute(query: GetWorkspaceQuery): Promise<WorkspaceDto> {
    const dto = await this.reads.findById(query.tenantId, query.workspaceId);
    if (dto === undefined) {
      throw new NotFoundError('Workspace not found', { workspaceId: query.workspaceId });
    }
    return dto;
  }
}
