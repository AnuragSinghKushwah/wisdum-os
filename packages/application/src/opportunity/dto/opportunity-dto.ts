import type { Opportunity } from '@wisdum/domain';

/** Wire-safe projection of an Opportunity aggregate. */
export interface OpportunityDto {
  readonly id: string;
  readonly insightId: string;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toOpportunityDto(opportunity: Opportunity): OpportunityDto {
  return {
    id: opportunity.getId().value(),
    insightId: opportunity.insightId,
    title: opportunity.title.value,
    rationale: opportunity.rationale.value,
    type: opportunity.type.value,
    status: opportunity.status.value,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
  };
}
