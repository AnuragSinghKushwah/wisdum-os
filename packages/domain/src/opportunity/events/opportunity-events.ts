import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { OpportunityTypeValue } from '../types/opportunity-types.js';

/**
 * Domain events of the opportunity bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const OPPORTUNITY_EVENT_SCHEMA_VERSION = 1;

export const INSIGHT_GENERATED = 'opportunity.insight.generated';
export const OPPORTUNITY_PROPOSED = 'opportunity.opportunity.proposed';
export const OPPORTUNITY_DRAFTED = 'opportunity.opportunity.drafted';
export const OPPORTUNITY_PUBLISHED = 'opportunity.opportunity.published';
export const OPPORTUNITY_DISMISSED = 'opportunity.opportunity.dismissed';
export const CONTENT_DRAFT_CREATED = 'opportunity.content-draft.created';
export const CONTENT_DRAFT_PUBLISHED = 'opportunity.content-draft.published';
export const CONTENT_PUBLISHED = 'opportunity.published-content.created';

type OpportunityDomainEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface InsightGeneratedPayload {
  readonly insightId: UUID;
  readonly conceptIds: readonly UUID[];
  readonly sourceKnowledgeIds: readonly UUID[];
}
export type InsightGenerated = OpportunityDomainEvent<
  typeof INSIGHT_GENERATED,
  InsightGeneratedPayload
>;

export interface OpportunityProposedPayload {
  readonly opportunityId: UUID;
  readonly insightId: UUID;
  readonly type: OpportunityTypeValue;
}
export type OpportunityProposed = OpportunityDomainEvent<
  typeof OPPORTUNITY_PROPOSED,
  OpportunityProposedPayload
>;

export interface OpportunityDraftedPayload {
  readonly opportunityId: UUID;
  readonly contentDraftId: UUID;
}
export type OpportunityDrafted = OpportunityDomainEvent<
  typeof OPPORTUNITY_DRAFTED,
  OpportunityDraftedPayload
>;

export interface OpportunityPublishedPayload {
  readonly opportunityId: UUID;
  readonly publishedContentId: UUID;
}
export type OpportunityPublished = OpportunityDomainEvent<
  typeof OPPORTUNITY_PUBLISHED,
  OpportunityPublishedPayload
>;

export interface OpportunityDismissedPayload {
  readonly opportunityId: UUID;
  readonly previousStatus: string;
}
export type OpportunityDismissed = OpportunityDomainEvent<
  typeof OPPORTUNITY_DISMISSED,
  OpportunityDismissedPayload
>;

export interface ContentDraftCreatedPayload {
  readonly contentDraftId: UUID;
  readonly opportunityId: UUID;
}
export type ContentDraftCreated = OpportunityDomainEvent<
  typeof CONTENT_DRAFT_CREATED,
  ContentDraftCreatedPayload
>;

export interface ContentDraftPublishedPayload {
  readonly contentDraftId: UUID;
  readonly opportunityId: UUID;
}
export type ContentDraftPublished = OpportunityDomainEvent<
  typeof CONTENT_DRAFT_PUBLISHED,
  ContentDraftPublishedPayload
>;

export interface ContentPublishedPayload {
  readonly publishedContentId: UUID;
  readonly draftId: UUID;
  readonly opportunityId: UUID;
  readonly slug: string;
}
export type ContentPublished = OpportunityDomainEvent<
  typeof CONTENT_PUBLISHED,
  ContentPublishedPayload
>;

export type AnyOpportunityEvent =
  | InsightGenerated
  | OpportunityProposed
  | OpportunityDrafted
  | OpportunityPublished
  | OpportunityDismissed
  | ContentDraftCreated
  | ContentDraftPublished
  | ContentPublished;
