import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import {
  ContentBody,
  ContentDraft,
  ContentDraftId,
  ContentTitle,
  Opportunity,
  OpportunityId,
  OpportunityRationale,
  OpportunityTitle,
  OpportunityType,
  Plugin,
  PluginCapability,
  PublishedContent,
  PublishedContentId,
  PublishedSlug,
} from '@wisdum/domain';
import type {
  Clock,
  ContentDraftRepository,
  OpportunityRepository,
  PluginId,
  PluginRepository,
  PublishedContentRepository,
} from '@wisdum/domain';
import { CapabilityPluginProvisioner } from '../../plugin/services/capability-plugin-provisioner.js';
import { CapabilityRegistry } from '@wisdum/kernel';
import type { PublishingProvider, PublishResult, PublishTarget } from '@wisdum/platform-publishing';
import type { DomainEventPublisher, IdGenerator, SlugGenerator } from '../../shared/ports.js';
import { PluginDisabledError } from '../../shared/errors.js';
import { publishContentDraftCommand } from '../commands/publish-content-draft-command.js';
import { PublishContentDraftHandler } from './publish-content-draft-handler.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

let idCounter = 0;
const ids: IdGenerator = {
  nextId: () => {
    idCounter += 1;
    return `00000000-0000-0000-0000-${idCounter.toString().padStart(12, '0')}` as UUID;
  },
};

const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };
const slugs: SlugGenerator = { slugify: (input) => input.toLowerCase().replace(/\s+/g, '-') };

class FakeContentDraftRepository implements ContentDraftRepository {
  private readonly byId = new Map<string, ContentDraft>();
  findById(id: ContentDraftId): Promise<Option<ContentDraft>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findByOpportunityId(): Promise<Option<ContentDraft>> {
    throw new Error('not used in this test');
  }
  listByTenant(tenantId: TenantId): Promise<readonly ContentDraft[]> {
    return Promise.resolve([...this.byId.values()].filter((d) => d.tenantId === tenantId));
  }
  save(draft: ContentDraft): Promise<void> {
    this.byId.set(draft.getId().value(), draft);
    return Promise.resolve();
  }
  delete(draft: ContentDraft): Promise<void> {
    this.byId.delete(draft.getId().value());
    return Promise.resolve();
  }
}

class FakeOpportunityRepository implements OpportunityRepository {
  private readonly byId = new Map<string, Opportunity>();
  findById(id: OpportunityId): Promise<Option<Opportunity>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]> {
    return Promise.resolve([...this.byId.values()].filter((o) => o.tenantId === tenantId));
  }
  save(opportunity: Opportunity): Promise<void> {
    this.byId.set(opportunity.getId().value(), opportunity);
    return Promise.resolve();
  }
  delete(opportunity: Opportunity): Promise<void> {
    this.byId.delete(opportunity.getId().value());
    return Promise.resolve();
  }
}

class FakePublishedContentRepository implements PublishedContentRepository {
  private readonly byId = new Map<string, PublishedContent>();
  saveCount = 0;
  findById(id: PublishedContentId): Promise<Option<PublishedContent>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findBySlug(tenantId: TenantId, slug: PublishedSlug): Promise<Option<PublishedContent>> {
    const found = [...this.byId.values()].find(
      (p) => p.tenantId === tenantId && p.slug.equals(slug),
    );
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findByDraftId(tenantId: TenantId, draftId: string): Promise<Option<PublishedContent>> {
    const found = [...this.byId.values()].find(
      (p) => p.tenantId === tenantId && p.draftId === draftId,
    );
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  listByTenant(tenantId: TenantId): Promise<readonly PublishedContent[]> {
    return Promise.resolve([...this.byId.values()].filter((p) => p.tenantId === tenantId));
  }
  save(published: PublishedContent): Promise<void> {
    this.saveCount += 1;
    this.byId.set(published.getId().value(), published);
    return Promise.resolve();
  }
  delete(published: PublishedContent): Promise<void> {
    this.byId.delete(published.getId().value());
    return Promise.resolve();
  }
}

class FakePluginRepository implements PluginRepository {
  private readonly byId = new Map<string, Plugin>();
  findById(id: PluginId): Promise<Option<Plugin>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findByName(): Promise<Option<Plugin>> {
    throw new Error('not used in this test');
  }
  findByCapability(tenantId: TenantId, capability: PluginCapability): Promise<readonly Plugin[]> {
    return Promise.resolve(
      [...this.byId.values()].filter(
        (plugin) => plugin.tenantId === tenantId && plugin.providesCapability(capability),
      ),
    );
  }
  findAll(tenantId: TenantId): Promise<readonly Plugin[]> {
    return Promise.resolve([...this.byId.values()].filter((p) => p.tenantId === tenantId));
  }
  save(plugin: Plugin): Promise<void> {
    this.byId.set(plugin.getId().value(), plugin);
    return Promise.resolve();
  }
  delete(plugin: Plugin): Promise<void> {
    this.byId.delete(plugin.getId().value());
    return Promise.resolve();
  }
}

class RecordingPublishingProvider implements PublishingProvider {
  readonly capability = 'publishing.website';
  callCount = 0;
  publish(target: PublishTarget): Promise<PublishResult> {
    this.callCount += 1;
    return Promise.resolve({ externalUrl: `https://wisdum.test/published/${target.publishedContentId}` });
  }
}

function buildOpportunityAndDraft(): { opportunity: Opportunity; draft: ContentDraft } {
  const opportunity = Opportunity.create(
    {
      id: OpportunityId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      insightId: '22222222-2222-2222-2222-222222222222' as UUID,
      title: OpportunityTitle.create('A great blog post'),
      rationale: OpportunityRationale.create('Because it is a great idea.'),
      type: OpportunityType.create('blog_post'),
    },
    clock,
  );
  const draft = ContentDraft.create(
    {
      id: ContentDraftId.create('33333333-3333-3333-3333-333333333333'),
      tenantId: TENANT_ID,
      opportunityId: opportunity.getId().value(),
      title: ContentTitle.create('A great blog post'),
      body: ContentBody.create('Body text.'),
    },
    clock,
  );
  opportunity.markDrafted(draft.getId().value(), clock);
  return { opportunity, draft };
}

function buildHandler(deps: {
  drafts: FakeContentDraftRepository;
  opportunities: FakeOpportunityRepository;
  published: FakePublishedContentRepository;
  plugins: FakePluginRepository;
  provider: RecordingPublishingProvider;
}): PublishContentDraftHandler {
  const provisioner = new CapabilityPluginProvisioner(deps.plugins, ids, events, clock);
  const providers = new CapabilityRegistry<PublishingProvider>('PublishingProvider');
  providers.register(deps.provider.capability, deps.provider);
  return new PublishContentDraftHandler(
    deps.drafts,
    deps.opportunities,
    deps.published,
    provisioner,
    providers,
    slugs,
    ids,
    events,
    clock,
  );
}

describe('PublishContentDraftHandler', () => {
  it('publishes a draft, auto-provisioning the website publishing plugin and recording its provider/URL', async () => {
    const drafts = new FakeContentDraftRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    const plugins = new FakePluginRepository();
    const provider = new RecordingPublishingProvider();
    const { opportunity, draft } = buildOpportunityAndDraft();
    await opportunities.save(opportunity);
    await drafts.save(draft);

    const handler = buildHandler({ drafts, opportunities, published, plugins, provider });
    const result = await handler.execute(
      publishContentDraftCommand({ tenantId: TENANT_ID, draftId: draft.getId().value() }),
    );

    expect(provider.callCount).toBe(1);
    const [saved] = await published.listByTenant(TENANT_ID);
    expect(saved?.getId().value()).toBe(result.publishedId);
    expect(saved?.providerCapability).toBe('publishing.website');
    expect(saved?.externalUrl).toBe(`https://wisdum.test/published/${result.publishedId}`);

    const [plugin] = await plugins.findByCapability(
      TENANT_ID,
      PluginCapability.create('publishing.website'),
    );
    expect(plugin?.isEnabled()).toBe(true);
  });

  it('rejects publishing with no side effects when the capability is disabled for the tenant', async () => {
    const drafts = new FakeContentDraftRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    const plugins = new FakePluginRepository();
    const provider = new RecordingPublishingProvider();
    const { opportunity, draft } = buildOpportunityAndDraft();
    await opportunities.save(opportunity);
    await drafts.save(draft);

    // Pre-provision the plugin, then disable it, as an operator would via the API.
    const provisioner = new CapabilityPluginProvisioner(plugins, ids, events, clock);
    await provisioner.ensureEnabled(TENANT_ID, {
      pluginName: 'wisdum/website-publishing',
      capability: 'publishing.website',
      displayName: 'Website Publishing',
      description: 'Publishes content to Wisdum-hosted public pages.',
      version: '1.0.0',
    });
    const [installed] = await plugins.findByCapability(
      TENANT_ID,
      PluginCapability.create('publishing.website'),
    );
    installed?.disable(clock);
    await plugins.save(installed as Plugin);

    const handler = buildHandler({ drafts, opportunities, published, plugins, provider });

    await expect(
      handler.execute(publishContentDraftCommand({ tenantId: TENANT_ID, draftId: draft.getId().value() })),
    ).rejects.toBeInstanceOf(PluginDisabledError);

    expect(provider.callCount).toBe(0);
    expect(published.saveCount).toBe(0);
    const [reloadedDraft] = [await drafts.findById(draft.getId())];
    expect(reloadedDraft.some && reloadedDraft.value.status.value).toBe('draft');
    const [reloadedOpportunity] = [await opportunities.findById(opportunity.getId())];
    expect(reloadedOpportunity.some && reloadedOpportunity.value.status.value).toBe('drafted');
  });

  it('is idempotent: a second publish of an already-published draft does not re-invoke the provider', async () => {
    const drafts = new FakeContentDraftRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    const plugins = new FakePluginRepository();
    const provider = new RecordingPublishingProvider();
    const { opportunity, draft } = buildOpportunityAndDraft();
    await opportunities.save(opportunity);
    await drafts.save(draft);

    const handler = buildHandler({ drafts, opportunities, published, plugins, provider });
    const command = publishContentDraftCommand({ tenantId: TENANT_ID, draftId: draft.getId().value() });

    const first = await handler.execute(command);
    const second = await handler.execute(command);

    expect(second).toEqual(first);
    expect(provider.callCount).toBe(1);
    expect(published.saveCount).toBe(1);
  });
});
