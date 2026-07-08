import { RunReasoningPassHandler } from '@wisdum/application';
import type {
  ConceptMentionRepository,
  ConceptRelationshipRepository,
  ConceptRepository,
} from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryConceptMentionRepository,
  InMemoryConceptRelationshipRepository,
  InMemoryConceptRepository,
  PostgresConceptMentionRepository,
  PostgresConceptRelationshipRepository,
  PostgresConceptRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { createLlmCompletionPort } from '../llm-completion-adapter.js';
import {
  CLOCK,
  DOCUMENT_READ_MODEL,
  EVENT_BUS,
  ID_GENERATOR,
  INSIGHT_REPOSITORY,
  KNOWLEDGE_READ_MODEL,
  LLM_MODEL,
  LLM_PROVIDER,
  OPPORTUNITY_REPOSITORY,
  PG_POOL,
  REASONING_HANDLERS,
} from '../tokens.js';
import type { ReasoningHandlers } from '../tokens.js';

/**
 * Wires the reasoning pipeline (Product Bible §5): the graph (Concept/
 * ConceptMention/ConceptRelationship) is owned entirely by this module —
 * nothing else in the API needs it — while Insight/Opportunity repositories
 * are shared with `OpportunityModule` via tokens so both modules read and
 * write the same underlying store.
 */
export class ReasoningModule implements KernelModule {
  readonly name = 'reasoning';
  readonly dependsOn = ['core', 'knowledge', 'document', 'opportunity'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);

    let concepts: ConceptRepository;
    let mentions: ConceptMentionRepository;
    let relationships: ConceptRelationshipRepository;

    if (pool !== undefined) {
      concepts = new PostgresConceptRepository(pool);
      mentions = new PostgresConceptMentionRepository(pool);
      relationships = new PostgresConceptRelationshipRepository(pool);
    } else {
      concepts = new InMemoryConceptRepository();
      mentions = new InMemoryConceptMentionRepository();
      relationships = new InMemoryConceptRelationshipRepository();
    }

    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const llm = createLlmCompletionPort(container.resolve(LLM_PROVIDER), container.resolve(LLM_MODEL));

    const handlers: ReasoningHandlers = {
      run: new RunReasoningPassHandler(
        container.resolve(KNOWLEDGE_READ_MODEL),
        container.resolve(DOCUMENT_READ_MODEL),
        concepts,
        mentions,
        relationships,
        container.resolve(INSIGHT_REPOSITORY),
        container.resolve(OPPORTUNITY_REPOSITORY),
        llm,
        ids,
        events,
        clock,
      ),
    };
    container.registerValue(REASONING_HANDLERS, handlers);
  }
}
