import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Knowledge } from '../entities/knowledge.js';
import type { KnowledgeId } from '../value-objects/knowledge-id.js';
import type { KnowledgeSlug } from '../value-objects/knowledge-slug.js';

/**
 * Persistence port of the Knowledge aggregate. Interface only — the
 * implementation lives outside the domain (ADR 0007). Slug uniqueness within
 * a tenant is enforced here, not inside the aggregate.
 */
export interface KnowledgeRepository extends Repository<Knowledge> {
  findById(id: KnowledgeId): Promise<Option<Knowledge>>;
  findBySlug(tenantId: TenantId, slug: KnowledgeSlug): Promise<Option<Knowledge>>;
  exists(id: KnowledgeId): Promise<boolean>;
  save(knowledge: Knowledge): Promise<void>;
  delete(knowledge: Knowledge): Promise<void>;
}
