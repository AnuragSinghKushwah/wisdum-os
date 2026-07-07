import type { TenantId } from '@wisdum/types';
import type { KnowledgeDto } from '../dto/knowledge-dto.js';

/**
 * Read-side port for Knowledge queries. Deliberately separate from
 * `KnowledgeRepository` (the write-side domain port): queries read a
 * projection optimized for display, never the aggregate itself.
 */
export interface KnowledgeReadModel {
  findById(tenantId: TenantId, knowledgeId: string): Promise<KnowledgeDto | undefined>;
  listByTenant(tenantId: TenantId, status?: string): Promise<readonly KnowledgeDto[]>;
}
