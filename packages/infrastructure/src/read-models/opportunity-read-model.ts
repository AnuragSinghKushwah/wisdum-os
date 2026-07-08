import { OpportunityId } from '@wisdum/domain';
import type { OpportunityDto, OpportunityReadModel } from '@wisdum/application';
import { toOpportunityDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { InMemoryOpportunityRepository } from '../persistence/opportunity-repository.js';

/** Reads directly off the in-memory repository. A real deployment would read a projection table instead. */
export class InMemoryOpportunityReadModel implements OpportunityReadModel {
  constructor(private readonly repository: InMemoryOpportunityRepository) {}

  async findById(tenantId: TenantId, opportunityId: string): Promise<OpportunityDto | undefined> {
    const found = await this.repository.findById(OpportunityId.create(opportunityId));
    return found.some && found.value.tenantId === tenantId
      ? toOpportunityDto(found.value)
      : undefined;
  }

  async listByTenant(tenantId: TenantId): Promise<readonly OpportunityDto[]> {
    const opportunities = await this.repository.listByTenant(tenantId);
    return opportunities.map(toOpportunityDto);
  }
}
