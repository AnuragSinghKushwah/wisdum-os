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
  readonly confidenceScore?: number;
  readonly sourceKnowledgeIds?: readonly string[];
  readonly sourceKnowledgeTitles?: readonly string[];
}

export function toOpportunityDto(
  opportunity: Opportunity,
  sourceKnowledgeIds?: readonly string[],
  sourceKnowledgeTitles?: readonly string[],
): OpportunityDto {
  const hash = opportunity.title.value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const confidenceScore = Number((0.65 + (hash % 31) / 100).toFixed(2)); // mock confidence score between 65% and 95%
  return {
    id: opportunity.getId().value(),
    insightId: opportunity.insightId,
    title: opportunity.title.value,
    rationale: opportunity.rationale.value,
    type: opportunity.type.value,
    status: opportunity.status.value,
    createdAt: opportunity.createdAt,
    updatedAt: opportunity.updatedAt,
    confidenceScore,
    sourceKnowledgeIds,
    sourceKnowledgeTitles,
  };
}
