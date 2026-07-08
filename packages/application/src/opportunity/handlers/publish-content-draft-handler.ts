import {
  ContentDraftId,
  OpportunityId,
  PublishedContent,
  PublishedContentId,
  PublishedSlug,
} from '@wisdum/domain';
import type {
  ContentDraftRepository,
  OpportunityRepository,
  PublishedContentRepository,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../shared/ports.js';
import type { PublishContentDraftCommand } from '../commands/publish-content-draft-command.js';

/**
 * The Publish step (Product Bible §10): snapshots a draft's current
 * content as a publicly viewable `PublishedContent` record, then marks
 * both the draft and its opportunity `published`.
 */
export class PublishContentDraftHandler implements CommandHandler<
  PublishContentDraftCommand,
  { publishedId: string; slug: string }
> {
  constructor(
    private readonly drafts: ContentDraftRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly published: PublishedContentRepository,
    private readonly slugs: SlugGenerator,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: PublishContentDraftCommand,
  ): Promise<{ publishedId: string; slug: string }> {
    const foundDraft = await this.drafts.findById(ContentDraftId.create(command.draftId));
    if (!foundDraft.some || foundDraft.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Content draft not found', { draftId: command.draftId });
    }
    const draft = foundDraft.value;

    // Idempotent: a retried request (network timeout, a double-clicked
    // Publish button) must return the existing record, not create a
    // duplicate and re-attempt a state transition that's already happened.
    const alreadyPublished = await this.published.findByDraftId(
      command.tenantId,
      draft.getId().value(),
    );
    if (alreadyPublished.some) {
      return {
        publishedId: alreadyPublished.value.getId().value(),
        slug: alreadyPublished.value.slug.value,
      };
    }

    const foundOpportunity = await this.opportunities.findById(
      OpportunityId.create(draft.opportunityId),
    );
    if (!foundOpportunity.some) {
      throw new NotFoundError('Opportunity not found', { opportunityId: draft.opportunityId });
    }
    const opportunity = foundOpportunity.value;

    const slug = await this.uniqueSlug(command.tenantId, this.slugs.slugify(draft.title.value));

    const publishedContent = PublishedContent.create(
      {
        id: PublishedContentId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        draftId: draft.getId().value(),
        opportunityId: opportunity.getId().value(),
        slug: PublishedSlug.create(slug),
        title: draft.title,
        body: draft.body,
      },
      this.clock,
    );
    await this.published.save(publishedContent);
    await this.events.publishAll(publishedContent.pullDomainEvents());
    publishedContent.clearDomainEvents();

    draft.markPublished(this.clock);
    await this.drafts.save(draft);
    await this.events.publishAll(draft.pullDomainEvents());
    draft.clearDomainEvents();

    opportunity.markPublished(publishedContent.getId().value(), this.clock);
    await this.opportunities.save(opportunity);
    await this.events.publishAll(opportunity.pullDomainEvents());
    opportunity.clearDomainEvents();

    return { publishedId: publishedContent.getId().value(), slug };
  }

  private async uniqueSlug(
    tenantId: PublishContentDraftCommand['tenantId'],
    baseSlug: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let attempt = 1;
    while ((await this.published.findBySlug(tenantId, PublishedSlug.create(candidate))).some) {
      attempt += 1;
      candidate = `${baseSlug}-${attempt}`;
    }
    return candidate;
  }
}
