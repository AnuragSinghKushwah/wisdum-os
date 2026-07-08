import type { QueryHandler } from '../../shared/messages.js';
import type { OpportunityDto } from '../dto/opportunity-dto.js';
import type { OpportunityReadModel } from '../ports/opportunity-read-model.js';
import type { ListOpportunitiesQuery } from '../queries/list-opportunities-query.js';

export class ListOpportunitiesHandler implements QueryHandler<
  ListOpportunitiesQuery,
  readonly OpportunityDto[]
> {
  constructor(private readonly reads: OpportunityReadModel) {}

  execute(query: ListOpportunitiesQuery): Promise<readonly OpportunityDto[]> {
    return this.reads.listByTenant(query.tenantId);
  }
}
