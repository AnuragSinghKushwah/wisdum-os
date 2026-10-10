import {
  CapabilityPluginProvisioner,
  DEFAULT_SOURCE_BUDGET_CHARS,
  CreateOpportunityHandler,
  DismissOpportunityHandler,
  GenerateContentDraftHandler,
  GenerateContentFromKnowledgeHandler,
  GetContentDraftHandler,
  GetOpportunityHandler,
  GetPublishedContentHandler,
  ListContentDraftsHandler,
  ListOpportunitiesHandler,
  ListPublishedContentHandler,
  PublishContentDraftHandler,
  SourceMaterialLoader,
  UpdateContentDraftHandler,
} from '@wisdum/application';
import type { OpportunityReadModel } from '@wisdum/application';
import { optionalEnv } from '@wisdum/config';
import type {
  ContentDraftRepository,
  InsightRepository,
  OpportunityRepository,
  PublishedContentRepository,
} from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryContentDraftRepository,
  InMemoryInsightRepository,
  InMemoryOpportunityReadModel,
  InMemoryOpportunityRepository,
  InMemoryPublishedContentRepository,
  PostgresContentDraftRepository,
  PostgresInsightRepository,
  PostgresOpportunityReadModel,
  PostgresOpportunityRepository,
  PostgresPublishedContentRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { createLlmCompletionPort } from '../llm-completion-adapter.js';
import { createPublishingProviders } from '../publishing-providers.js';
import {
  CLOCK,
  DOCUMENT_READ_MODEL,
  EVENT_BUS,
  ID_GENERATOR,
  INSIGHT_REPOSITORY,
  LLM_MODEL,
  LLM_PROVIDER,
  LLM_STATUS,
  OPPORTUNITY_HANDLERS,
  OPPORTUNITY_REPOSITORY,
  PG_POOL,
  PLUGIN_REPOSITORY,
  PUBLISHED_CONTENT_REPOSITORY,
  PUBLISHING_PROVIDERS,
  SLUG_GENERATOR,
  KNOWLEDGE_READ_MODEL,
} from '../tokens.js';
import type { OpportunityHandlers } from '../tokens.js';

/** Characters of source text sent per draft; `WISDUM_SOURCE_BUDGET_CHARS` overrides it, within sane limits. */
function sourceBudgetChars(): number {
  const configured = Number(optionalEnv('WISDUM_SOURCE_BUDGET_CHARS', ''));
  return Number.isFinite(configured) && configured > 0
    ? Math.min(Math.max(Math.floor(configured), 2_000), 400_000)
    : DEFAULT_SOURCE_BUDGET_CHARS;
}

export class OpportunityModule implements KernelModule {
  readonly name = 'opportunity';
  readonly dependsOn = ['core', 'plugin', 'document', 'knowledge'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);

    let opportunities: OpportunityRepository;
    let insights: InsightRepository;
    let drafts: ContentDraftRepository;
    let published: PublishedContentRepository;
    let readModel: OpportunityReadModel;

    if (pool !== undefined) {
      const postgresOpportunities = new PostgresOpportunityRepository(pool);
      opportunities = postgresOpportunities;
      insights = new PostgresInsightRepository(pool);
      drafts = new PostgresContentDraftRepository(pool);
      published = new PostgresPublishedContentRepository(pool);
      readModel = new PostgresOpportunityReadModel(
        postgresOpportunities,
        insights,
        container.resolve(KNOWLEDGE_READ_MODEL),
      );
    } else {
      const inMemoryOpportunities = new InMemoryOpportunityRepository();
      opportunities = inMemoryOpportunities;
      insights = new InMemoryInsightRepository();
      drafts = new InMemoryContentDraftRepository();
      published = new InMemoryPublishedContentRepository();
      readModel = new InMemoryOpportunityReadModel(
        inMemoryOpportunities,
        insights,
        container.resolve(KNOWLEDGE_READ_MODEL),
      );
    }

    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const slugs = container.resolve(SLUG_GENERATOR);
    const llmStatus = container.resolve(LLM_STATUS);
    const llm = createLlmCompletionPort(
      container.resolve(LLM_PROVIDER),
      container.resolve(LLM_MODEL),
      llmStatus.mode === 'live' ? llmStatus.provider : undefined,
    );
    const knowledgeReads = container.resolve(KNOWLEDGE_READ_MODEL);
    const sources = new SourceMaterialLoader(
      knowledgeReads,
      container.resolve(DOCUMENT_READ_MODEL),
      sourceBudgetChars(),
    );

    const plugins = container.resolve(PLUGIN_REPOSITORY);
    const provisioner = new CapabilityPluginProvisioner(plugins, ids, events, clock);
    const providers = createPublishingProviders();
    container.registerValue(PUBLISHING_PROVIDERS, providers);

    const generateDraft = new GenerateContentDraftHandler(
      opportunities,
      insights,
      drafts,
      llm,
      sources,
      ids,
      events,
      clock,
    );
    const handlers: OpportunityHandlers = {
      create: new CreateOpportunityHandler(opportunities, insights, ids, events, clock),
      dismiss: new DismissOpportunityHandler(opportunities, events, clock),
      get: new GetOpportunityHandler(readModel),
      list: new ListOpportunitiesHandler(readModel),
      generateDraft,
      generateFromKnowledge: new GenerateContentFromKnowledgeHandler(
        knowledgeReads,
        sources,
        opportunities,
        insights,
        generateDraft,
        llm,
        ids,
        events,
        clock,
      ),
      getDraft: new GetContentDraftHandler(drafts),
      listDrafts: new ListContentDraftsHandler(drafts),
      updateDraft: new UpdateContentDraftHandler(drafts, clock),
      publishDraft: new PublishContentDraftHandler(
        drafts,
        opportunities,
        published,
        provisioner,
        providers,
        slugs,
        ids,
        events,
        clock,
      ),
      getPublished: new GetPublishedContentHandler(published),
      listPublished: new ListPublishedContentHandler(published),
    };
    container.registerValue(OPPORTUNITY_HANDLERS, handlers);
    container.registerValue(OPPORTUNITY_REPOSITORY, opportunities);
    container.registerValue(INSIGHT_REPOSITORY, insights);
    container.registerValue(PUBLISHED_CONTENT_REPOSITORY, published);
  }
}
