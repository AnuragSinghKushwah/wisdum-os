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
import type { CapabilityRegistry } from '@wisdum/kernel';
import type { PublishingProvider } from '@wisdum/platform-publishing';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError, PluginDisabledError } from '../../shared/errors.js';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../shared/ports.js';
import type { CapabilityPluginProvisioner } from '../../plugin/services/capability-plugin-provisioner.js';
import type { PublishContentDraftCommand } from '../commands/publish-content-draft-command.js';

/** The only publishing capability this POC ships with. Phase 5 adds real external providers alongside it. */
interface DefaultCapabilityManifest {
  readonly pluginName: string;
  readonly capability: string;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
}

const PUBLISHING_MANIFESTS: Record<string, DefaultCapabilityManifest> = {
  'publishing.website': {
    pluginName: 'wisdum/website-publishing',
    capability: 'publishing.website',
    displayName: 'Website Publishing',
    description: 'Publishes content to Wisdum-hosted public pages.',
    version: '1.0.0',
  },
  'publishing.devto': {
    pluginName: 'wisdum/devto-publishing',
    capability: 'publishing.devto',
    displayName: 'Dev.to Publishing',
    description: 'Publishes content to Dev.to.',
    version: '1.0.0',
  },
  'publishing.ghost': {
    pluginName: 'wisdum/ghost-publishing',
    capability: 'publishing.ghost',
    displayName: 'Ghost Publishing',
    description: 'Publishes content to a Ghost blog.',
    version: '1.0.0',
  },
  'publishing.substack': {
    pluginName: 'wisdum/substack-publishing',
    capability: 'publishing.substack',
    displayName: 'Substack Publishing',
    description: 'Publishes content to Substack via webhook.',
    version: '1.0.0',
  },
};

function getCapabilityForType(type: string): string {
  switch (type) {
    case 'blog_post':
      return 'publishing.website';
    case 'newsletter':
      return 'publishing.substack';
    default:
      return 'publishing.website';
  }
}

/**
 * The Publish step (Product Bible §10): snapshots a draft's current
 * content as a publicly viewable `PublishedContent` record, then marks
 * both the draft and its opportunity `published`. Publishing is itself a
 * plugin capability (`publishing.website` today) — a tenant can disable it,
 * which must fail this handler before any side effect occurs.
 */
export class PublishContentDraftHandler implements CommandHandler<
  PublishContentDraftCommand,
  { publishedId: string; slug: string; externalUrl?: string }
> {
  constructor(
    private readonly drafts: ContentDraftRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly published: PublishedContentRepository,
    private readonly provisioner: CapabilityPluginProvisioner,
    private readonly providers: CapabilityRegistry<PublishingProvider>,
    private readonly slugs: SlugGenerator,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: PublishContentDraftCommand,
  ): Promise<{ publishedId: string; slug: string; externalUrl?: string }> {
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
        externalUrl: alreadyPublished.value.externalUrl,
      };
    }

    const foundOpportunity = await this.opportunities.findById(
      OpportunityId.create(draft.opportunityId),
    );
    if (!foundOpportunity.some) {
      throw new NotFoundError('Opportunity not found', { opportunityId: draft.opportunityId });
    }
    const opportunity = foundOpportunity.value;

    let capability = 'publishing.website';
    const preferred = getCapabilityForType(opportunity.type.value);
    if (preferred !== 'publishing.website' && this.providers.resolve(preferred) !== undefined) {
      capability = preferred;
    } else if (opportunity.type.value === 'blog_post') {
      if (this.providers.resolve('publishing.ghost') !== undefined) {
        capability = 'publishing.ghost';
      } else if (this.providers.resolve('publishing.devto') !== undefined) {
        capability = 'publishing.devto';
      }
    }

    const manifest =
      PUBLISHING_MANIFESTS[capability] ?? PUBLISHING_MANIFESTS['publishing.website']!;

    const enabled = await this.provisioner.ensureEnabled(command.tenantId, manifest);
    if (!enabled) {
      throw new PluginDisabledError(
        `The ${manifest.displayName} capability is disabled for this tenant`,
        { capability },
      );
    }
    const provider = this.providers.require(capability);

    const slug = await this.uniqueSlug(command.tenantId, this.slugs.slugify(draft.title.value));
    const publishedId = PublishedContentId.create(this.ids.nextId());
    const result = await provider.publish({
      tenantId: command.tenantId,
      publishedContentId: publishedId.value(),
      slug,
      title: draft.title.value,
      body: draft.body.value,
    });

    const publishedContent = PublishedContent.create(
      {
        id: publishedId,
        tenantId: command.tenantId,
        draftId: draft.getId().value(),
        opportunityId: opportunity.getId().value(),
        slug: PublishedSlug.create(slug),
        title: draft.title,
        body: draft.body,
        providerCapability: capability,
        externalUrl: result.externalUrl,
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

    return { publishedId: publishedContent.getId().value(), slug, externalUrl: result.externalUrl };
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
