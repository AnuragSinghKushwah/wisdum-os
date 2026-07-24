import type { QueryHandler } from '../../shared/messages.js';
import type { WorkspaceDto } from '../dto/workspace-dto.js';
import type { WorkspaceReadModel } from '../ports/workspace-read-model.js';
import type { ListWorkspacesQuery } from '../queries/list-workspaces-query.js';

export class ListWorkspacesHandler implements QueryHandler<ListWorkspacesQuery, readonly WorkspaceDto[]> {
  constructor(private readonly reads: WorkspaceReadModel) {}

  async execute(query: ListWorkspacesQuery): Promise<readonly WorkspaceDto[]> {
    return this.reads.listByTenant(query.tenantId);
  }
}
