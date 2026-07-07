import type { TenantId } from '@wisdum/types';
import type { DomainService } from '../../shared/index.js';
import type { KnowledgeSlug } from '../value-objects/knowledge-slug.js';

/**
 * Coordinates lifecycle concerns that reach beyond a single Knowledge
 * aggregate — checks that require repository-backed state, such as slug
 * uniqueness within a tenant. Interface only; the application layer provides
 * the implementation.
 */
export interface KnowledgeLifecycleService extends DomainService {
  /** True when no knowledge asset in the tenant currently uses the slug. */
  isSlugAvailable(tenantId: TenantId, slug: KnowledgeSlug): Promise<boolean>;
}
