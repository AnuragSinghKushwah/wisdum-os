import type { Option, TenantId, UUID } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Workspace } from '../entities/workspace.js';
import type { WorkspaceId } from '../value-objects/workspace-id.js';
import type { WorkspaceSlug } from '../value-objects/workspace-slug.js';

/**
 * Persistence port of the Workspace aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007).
 */
export interface WorkspaceRepository extends Repository<Workspace> {
  findById(id: WorkspaceId): Promise<Option<Workspace>>;
  /** Slug is the tenant-scoped natural key used in URLs. */
  findBySlug(tenantId: TenantId, slug: WorkspaceSlug): Promise<Option<Workspace>>;
  findByOrganization(tenantId: TenantId, organizationId: UUID): Promise<readonly Workspace[]>;
  findByTenant(tenantId: TenantId): Promise<readonly Workspace[]>;
  exists(id: WorkspaceId): Promise<boolean>;
  save(workspace: Workspace): Promise<void>;
  delete(workspace: Workspace): Promise<void>;
}
