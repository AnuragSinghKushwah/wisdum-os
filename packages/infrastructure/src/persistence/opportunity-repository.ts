import type {
  ContentDraft,
  ContentDraftId,
  ContentDraftRepository,
  Insight,
  InsightId,
  InsightRepository,
  Opportunity,
  OpportunityId,
  OpportunityRepository,
  PublishedContent,
  PublishedContentId,
  PublishedContentRepository,
  PublishedSlug,
} from '@wisdum/domain';
import type { Option, TenantId } from '@wisdum/types';
import { none, some } from '@wisdum/types';
import { InMemoryRepository } from './in-memory-repository.js';

export class InMemoryInsightRepository
  extends InMemoryRepository<InsightId, Insight>
  implements InsightRepository {}

export class InMemoryOpportunityRepository
  extends InMemoryRepository<OpportunityId, Opportunity>
  implements OpportunityRepository
{
  listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]> {
    return Promise.resolve(this.values().filter((opportunity) => opportunity.tenantId === tenantId));
  }
}

export class InMemoryContentDraftRepository
  extends InMemoryRepository<ContentDraftId, ContentDraft>
  implements ContentDraftRepository
{
  findByOpportunityId(tenantId: TenantId, opportunityId: string): Promise<Option<ContentDraft>> {
    const found = this.values().find(
      (draft) => draft.tenantId === tenantId && draft.opportunityId === opportunityId,
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  listByTenant(tenantId: TenantId): Promise<readonly ContentDraft[]> {
    return Promise.resolve(this.values().filter((draft) => draft.tenantId === tenantId));
  }
}

export class InMemoryPublishedContentRepository
  extends InMemoryRepository<PublishedContentId, PublishedContent>
  implements PublishedContentRepository
{
  findBySlug(tenantId: TenantId, slug: PublishedSlug): Promise<Option<PublishedContent>> {
    const found = this.values().find(
      (published) => published.tenantId === tenantId && published.slug.equals(slug),
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  findByDraftId(tenantId: TenantId, draftId: string): Promise<Option<PublishedContent>> {
    const found = this.values().find(
      (published) => published.tenantId === tenantId && published.draftId === draftId,
    );
    return Promise.resolve(found === undefined ? none : some(found));
  }

  listByTenant(tenantId: TenantId): Promise<readonly PublishedContent[]> {
    return Promise.resolve(this.values().filter((published) => published.tenantId === tenantId));
  }
}
