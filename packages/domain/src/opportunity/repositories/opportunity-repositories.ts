import type { Option, TenantId } from '@wisdum/types';
import type { Repository } from '../../shared/index.js';
import type { Insight } from '../entities/insight.js';
import type { Opportunity } from '../entities/opportunity.js';
import type { ContentDraft } from '../entities/content-draft.js';
import type { PublishedContent } from '../entities/published-content.js';
import type {
  ContentDraftId,
  InsightId,
  OpportunityId,
  PublishedContentId,
} from '../value-objects/opportunity-ids.js';
import type { PublishedSlug } from '../value-objects/published-slug.js';

export interface InsightRepository extends Repository<Insight> {
  findById(id: InsightId): Promise<Option<Insight>>;
  save(insight: Insight): Promise<void>;
  delete(insight: Insight): Promise<void>;
}

export interface OpportunityRepository extends Repository<Opportunity> {
  findById(id: OpportunityId): Promise<Option<Opportunity>>;
  listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]>;
  save(opportunity: Opportunity): Promise<void>;
  delete(opportunity: Opportunity): Promise<void>;
}

export interface ContentDraftRepository extends Repository<ContentDraft> {
  findById(id: ContentDraftId): Promise<Option<ContentDraft>>;
  findByOpportunityId(tenantId: TenantId, opportunityId: string): Promise<Option<ContentDraft>>;
  save(draft: ContentDraft): Promise<void>;
  delete(draft: ContentDraft): Promise<void>;
}

/**
 * Persistence port of the PublishedContent aggregate. `findBySlug` powers
 * the public, unauthenticated route that serves the Measure step (§11).
 */
export interface PublishedContentRepository extends Repository<PublishedContent> {
  findById(id: PublishedContentId): Promise<Option<PublishedContent>>;
  findBySlug(tenantId: TenantId, slug: PublishedSlug): Promise<Option<PublishedContent>>;
  /** Powers idempotent re-publish: a retry of an already-published draft must not create a duplicate. */
  findByDraftId(tenantId: TenantId, draftId: string): Promise<Option<PublishedContent>>;
  save(published: PublishedContent): Promise<void>;
  delete(published: PublishedContent): Promise<void>;
}
