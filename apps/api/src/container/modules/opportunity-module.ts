import {
  GenerateContentDraftHandler,
  GetContentDraftHandler,
  GetOpportunityHandler,
  GetPublishedContentHandler,
  ListOpportunitiesHandler,
  PublishContentDraftHandler,
  UpdateContentDraftHandler,
} from '@wisdum/application';
import type { OpportunityReadModel } from '@wisdum/application';
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
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  INSIGHT_REPOSITORY,
  LLM_MODEL,
  LLM_PROVIDER,
  OPPORTUNITY_HANDLERS,
  OPPORTUNITY_REPOSITORY,
  PG_POOL,
  SLUG_GENERATOR,
} from '../tokens.js';
import type { OpportunityHandlers } from '../tokens.js';

export class OpportunityModule implements KernelModule {
  readonly name = 'opportunity';
  readonly dependsOn = ['core'];

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
      readModel = new PostgresOpportunityReadModel(postgresOpportunities);
    } else {
      const inMemoryOpportunities = new InMemoryOpportunityRepository();
      opportunities = inMemoryOpportunities;
      insights = new InMemoryInsightRepository();
      drafts = new InMemoryContentDraftRepository();
      published = new InMemoryPublishedContentRepository();
      readModel = new InMemoryOpportunityReadModel(inMemoryOpportunities);
    }

    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const slugs = container.resolve(SLUG_GENERATOR);
    const llm = createLlmCompletionPort(container.resolve(LLM_PROVIDER), container.resolve(LLM_MODEL));

    const handlers: OpportunityHandlers = {
      get: new GetOpportunityHandler(readModel),
      list: new ListOpportunitiesHandler(readModel),
      generateDraft: new GenerateContentDraftHandler(opportunities, insights, drafts, llm, ids, events, clock),
      getDraft: new GetContentDraftHandler(drafts),
      updateDraft: new UpdateContentDraftHandler(drafts, clock),
      publishDraft: new PublishContentDraftHandler(drafts, opportunities, published, slugs, ids, events, clock),
      getPublished: new GetPublishedContentHandler(published),
    };
    container.registerValue(OPPORTUNITY_HANDLERS, handlers);
    container.registerValue(OPPORTUNITY_REPOSITORY, opportunities);
    container.registerValue(INSIGHT_REPOSITORY, insights);
  }
}
