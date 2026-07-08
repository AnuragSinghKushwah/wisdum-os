import { OpportunityId } from '@wisdum/domain';
import type { OpportunityDto, OpportunityReadModel } from '@wisdum/application';
import { toOpportunityDto } from '@wisdum/application';
import type { TenantId } from '@wisdum/types';
import type { PostgresOpportunityRepository } from '../../persistence/postgres/opportunity-repository.postgres.js';

/** Reads off the Postgres write-side repository directly; no separate projection table yet. */
export class PostgresOpportunityReadModel implements OpportunityReadModel {
  constructor(private readonly repository: PostgresOpportunityRepository) {}

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
