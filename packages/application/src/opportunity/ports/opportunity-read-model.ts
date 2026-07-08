import type { TenantId } from '@wisdum/types';
import type { OpportunityDto } from '../dto/opportunity-dto.js';

/**
 * Read-side port for Opportunity queries. Deliberately separate from
 * `OpportunityRepository` (the write-side domain port), mirroring
 * `KnowledgeReadModel`.
 */
export interface OpportunityReadModel {
  findById(tenantId: TenantId, opportunityId: string): Promise<OpportunityDto | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly OpportunityDto[]>;
}
