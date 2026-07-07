import type { Workspace, WorkspaceId, WorkspaceRepository, WorkspaceSlug } from '@wisdum/domain';
import type { Option, TenantId, UUID } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryWorkspaceRepository
  extends InMemoryRepository<WorkspaceId, Workspace>
  implements WorkspaceRepository
{
  findBySlug(tenantId: TenantId, slug: WorkspaceSlug): Promise<Option<Workspace>> {
    const found = this.values().find(
      (workspace) => workspace.tenantId === tenantId && workspace.slug.equals(slug),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findByOrganization(tenantId: TenantId, organizationId: UUID): Promise<readonly Workspace[]> {
    return Promise.resolve(
      this.values().filter(
        (workspace) =>
          workspace.tenantId === tenantId && workspace.organizationId === organizationId,
      ),
    );
  }
}
