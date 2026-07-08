import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { OpportunityDto } from '../dto/opportunity-dto.js';
import type { OpportunityReadModel } from '../ports/opportunity-read-model.js';
import type { GetOpportunityQuery } from '../queries/get-opportunity-query.js';

export class GetOpportunityHandler implements QueryHandler<GetOpportunityQuery, OpportunityDto> {
  constructor(private readonly reads: OpportunityReadModel) {}

  async execute(query: GetOpportunityQuery): Promise<OpportunityDto> {
    const dto = await this.reads.findById(query.tenantId, query.opportunityId);
    if (dto === undefined) {
      throw new NotFoundError('Opportunity not found', { opportunityId: query.opportunityId });
    }
    return dto;
  }
}
