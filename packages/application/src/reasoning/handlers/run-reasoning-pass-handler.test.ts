import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import type {
  Concept,
  ConceptId,
  ConceptMention,
  ConceptMentionId,
  ConceptName,
  ConceptRelationship,
  ConceptRelationshipId,
  ConceptRelationshipType,
  Insight,
  InsightId,
  Opportunity,
  OpportunityId,
  PublishedContent,
} from '@wisdum/domain';
import type {
  Clock,
  ConceptMentionRepository,
  ConceptRelationshipRepository,
  ConceptRepository,
  InsightRepository,
  OpportunityRepository,
  PublishedContentRepository,
} from '@wisdum/domain';
import type { DocumentDto, DocumentReadModel } from '../../document/index.js';
import type { KnowledgeContentReferenceDto, KnowledgeDto, KnowledgeReadModel } from '../../knowledge/index.js';
import type { DomainEventPublisher, IdGenerator, LlmCompletionPort } from '../../shared/ports.js';
import { runReasoningPassCommand } from '../commands/run-reasoning-pass-command.js';
import { RunReasoningPassHandler } from './run-reasoning-pass-handler.js';

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

class FakeKnowledgeReadModel implements KnowledgeReadModel {
  constructor(private readonly assets: readonly KnowledgeDto[]) {}
  findById(): Promise<KnowledgeDto | undefined> {
    throw new Error('not used in this test');
  }
  listByTenant(): Promise<readonly KnowledgeDto[]> {
    return Promise.resolve(this.assets);
  }
}

class FakeDocumentReadModel implements DocumentReadModel {
  constructor(private readonly byId: Map<string, DocumentDto>) {}
  findById(tenantId: TenantId, documentId: string): Promise<DocumentDto | undefined> {
    // The fixtures all belong to TENANT_ID; anyone else sees nothing.
    return Promise.resolve(tenantId === TENANT_ID ? this.byId.get(documentId) : undefined);
  }
}

class FakeConceptRepository implements ConceptRepository {
  private readonly byId = new Map<string, Concept>();
  findById(id: ConceptId): Promise<Option<Concept>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findByName(tenantId: TenantId, name: ConceptName): Promise<Option<Concept>> {
    for (const concept of this.byId.values()) {
      if (concept.tenantId === tenantId && concept.name.equals(name)) {
        return Promise.resolve({ some: true, value: concept });
      }
    }
    return Promise.resolve({ some: false });
  }
  listByTenant(tenantId: TenantId): Promise<readonly Concept[]> {
    return Promise.resolve([...this.byId.values()].filter((c) => c.tenantId === tenantId));
  }
  save(concept: Concept): Promise<void> {
    this.byId.set(concept.getId().value(), concept);
    return Promise.resolve();
  }
  delete(concept: Concept): Promise<void> {
    this.byId.delete(concept.getId().value());
    return Promise.resolve();
  }
}

class FakeConceptMentionRepository implements ConceptMentionRepository {
  private readonly byId = new Map<string, ConceptMention>();
  findById(id: ConceptMentionId): Promise<Option<ConceptMention>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findExisting(
    tenantId: TenantId,
    conceptId: ConceptId,
    knowledgeId: string,
  ): Promise<Option<ConceptMention>> {
    for (const mention of this.byId.values()) {
      if (
        mention.tenantId === tenantId &&
        mention.conceptId.equals(conceptId) &&
        mention.knowledgeId === knowledgeId
      ) {
        return Promise.resolve({ some: true, value: mention });
      }
    }
    return Promise.resolve({ some: false });
  }
  listByConcept(tenantId: TenantId, conceptId: ConceptId): Promise<readonly ConceptMention[]> {
    return Promise.resolve(
      [...this.byId.values()].filter(
        (m) => m.tenantId === tenantId && m.conceptId.equals(conceptId),
      ),
    );
  }
  save(mention: ConceptMention): Promise<void> {
    this.byId.set(mention.getId().value(), mention);
    return Promise.resolve();
  }
  delete(mention: ConceptMention): Promise<void> {
    this.byId.delete(mention.getId().value());
    return Promise.resolve();
  }
}

class FakeConceptRelationshipRepository implements ConceptRelationshipRepository {
  private readonly byId = new Map<string, ConceptRelationship>();
  findById(id: ConceptRelationshipId): Promise<Option<ConceptRelationship>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  findExisting(
    tenantId: TenantId,
    conceptAId: ConceptId,
    conceptBId: ConceptId,
    relationshipType: ConceptRelationshipType,
  ): Promise<Option<ConceptRelationship>> {
    for (const relationship of this.byId.values()) {
      if (
        relationship.tenantId === tenantId &&
        relationship.conceptAId.equals(conceptAId) &&
        relationship.conceptBId.equals(conceptBId) &&
        relationship.relationshipType.equals(relationshipType)
      ) {
        return Promise.resolve({ some: true, value: relationship });
      }
    }
    return Promise.resolve({ some: false });
  }
  listByTenant(tenantId: TenantId): Promise<readonly ConceptRelationship[]> {
    return Promise.resolve([...this.byId.values()].filter((r) => r.tenantId === tenantId));
  }
  save(relationship: ConceptRelationship): Promise<void> {
    this.byId.set(relationship.getId().value(), relationship);
    return Promise.resolve();
  }
  delete(relationship: ConceptRelationship): Promise<void> {
    this.byId.delete(relationship.getId().value());
    return Promise.resolve();
  }
}

class FakeInsightRepository implements InsightRepository {
  private readonly byId = new Map<string, Insight>();
  findById(id: InsightId): Promise<Option<Insight>> {
    const found = this.byId.get(id.value());
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }
  save(insight: Insight): Promise<void> {
    this.byId.set(insight.getId().value(), insight);
    return Promise.resolve();
  }
  delete(insight: Insight): Promise<void> {
    this.byId.delete(insight.getId().value());
    return Promise.resolve();
  }
  all(): readonly Insight[] {
    return [...this.byId.values()];
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
  private readonly items: PublishedContent[] = [];
  findById(): Promise<Option<PublishedContent>> {
    throw new Error('not implemented');
  }
  findBySlug(): Promise<Option<PublishedContent>> {
    throw new Error('not implemented');
  }
  findByDraftId(): Promise<Option<PublishedContent>> {
    throw new Error('not implemented');
  }
  listByTenant(tenantId: TenantId): Promise<readonly PublishedContent[]> {
    return Promise.resolve(this.items.filter((item) => item.tenantId === tenantId));
  }
  save(published: PublishedContent): Promise<void> {
    this.items.push(published);
    return Promise.resolve();
  }
  delete(): Promise<void> {
    throw new Error('not implemented');
  }
}

/** Always extracts the same two co-occurring concepts, and always proposes one opportunity per insight. */
class ScriptedLlmCompletionPort implements LlmCompletionPort {
  calls: string[] = [];
  complete(prompt: string): Promise<string> {
    this.calls.push(prompt);
    if (prompt.includes('Extract')) {
      return Promise.resolve(
        JSON.stringify([
          { name: 'Redis Scaling', description: 'Scaling Redis under load.' },
          { name: 'Caching Strategy', description: 'How the cache is structured.' },
        ]),
      );
    }
    if (prompt.includes('propose')) {
      return Promise.resolve(
        JSON.stringify([
          { title: 'Redis Scaling Deep Dive', type: 'blog_post', rationale: 'You keep solving this.' },
        ]),
      );
    }
    return Promise.resolve('unused');
  }
}

/** Extracts a single, never-repeated concept — never pairs into a relationship. */
class SingleConceptLlmCompletionPort implements LlmCompletionPort {
  complete(prompt: string): Promise<string> {
    if (prompt.includes('Extract')) {
      return Promise.resolve(
        JSON.stringify([{ name: 'Redis Scaling', description: 'Scaling Redis under load.' }]),
      );
    }
    if (prompt.includes('propose')) {
      return Promise.resolve(
        JSON.stringify([
          { title: 'Redis Scaling Deep Dive', type: 'blog_post', rationale: 'You keep solving this.' },
        ]),
      );
    }
    return Promise.resolve('unused');
  }
}

function contentRef(documentId: string): KnowledgeContentReferenceDto {
  return { reference: documentId, mimeType: 'text/plain' };
}

function knowledgeAsset(id: string, documentId: string): KnowledgeDto {
  return {
    id,
    title: `Asset ${id}`,
    slug: `asset-${id}`,
    description: '',
    type: 'note',
    status: 'active',
    visibility: 'private',
    version: 1,
    labels: [],
    contentReferences: [contentRef(documentId)],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    properties: {},
  };
}

function document(id: string, content: string): DocumentDto {
  return {
    id,
    content,
    mimeType: 'text/plain',
    language: 'und',
    encoding: 'utf-8',
    sizeBytes: content.length,
    contentHash: 'sha-256:fake',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('RunReasoningPassHandler', () => {
  it('links a shared concept across two assets into a relationship, then an insight and an opportunity', async () => {
    const knowledgeReads = new FakeKnowledgeReadModel([
      knowledgeAsset('11111111-1111-1111-1111-111111111111', 'doc-1'),
      knowledgeAsset('22222222-2222-2222-2222-222222222222', 'doc-2'),
    ]);
    const documentReads = new FakeDocumentReadModel(
      new Map([
        ['doc-1', document('doc-1', 'Notes about scaling Redis in production.')],
        ['doc-2', document('doc-2', 'More notes about scaling Redis under load.')],
      ]),
    );
    const concepts = new FakeConceptRepository();
    const mentions = new FakeConceptMentionRepository();
    const relationships = new FakeConceptRelationshipRepository();
    const insights = new FakeInsightRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    const llm = new ScriptedLlmCompletionPort();

    const handler = new RunReasoningPassHandler(
      knowledgeReads,
      documentReads,
      concepts,
      mentions,
      relationships,
      insights,
      opportunities,
      published,
      llm,
      ids,
      events,
      clock,
    );

    const result = await handler.execute(runReasoningPassCommand({ tenantId: TENANT_ID }));

    // Two new concepts, each mentioned on both assets, paired into one
    // relationship whose occurrence count crosses the pattern threshold —
    // the "Reason -> Insight -> Opportunity" branch, not the fallback.
    expect(result.conceptsFound).toBe(2);
    const conceptsAfterFirstRun = await concepts.listByTenant(TENANT_ID);
    expect(conceptsAfterFirstRun.every((c) => c.mentionCount === 2)).toBe(true);
    const relationshipsAfterFirstRun = await relationships.listByTenant(TENANT_ID);
    expect(relationshipsAfterFirstRun).toHaveLength(1);
    expect(relationshipsAfterFirstRun[0]?.occurrenceCount).toBe(2);
    expect(result.insightsCreated).toBe(1);
    expect(result.opportunitiesCreated).toBe(1);
    expect((await opportunities.listByTenant(TENANT_ID))[0]?.title.value).toBe(
      'Redis Scaling Deep Dive',
    );

    // Rerunning on unchanged data must not inflate the occurrence count —
    // nothing "new" happened on either asset, so co-occurrence is skipped.
    await handler.execute(runReasoningPassCommand({ tenantId: TENANT_ID }));
    const relationshipsAfterSecondRun = await relationships.listByTenant(TENANT_ID);
    expect(relationshipsAfterSecondRun).toHaveLength(1);
    expect(relationshipsAfterSecondRun[0]?.occurrenceCount).toBe(2);
  });

  it('does not crash and does not duplicate mentions when run twice on the same data', async () => {
    const knowledgeReads = new FakeKnowledgeReadModel([
      knowledgeAsset('11111111-1111-1111-1111-111111111111', 'doc-1'),
    ]);
    const documentReads = new FakeDocumentReadModel(
      new Map([['doc-1', document('doc-1', 'Notes about scaling Redis in production.')]]),
    );
    const concepts = new FakeConceptRepository();
    const mentions = new FakeConceptMentionRepository();
    const relationships = new FakeConceptRelationshipRepository();
    const insights = new FakeInsightRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    const llm = new SingleConceptLlmCompletionPort();

    const handler = new RunReasoningPassHandler(
      knowledgeReads,
      documentReads,
      concepts,
      mentions,
      relationships,
      insights,
      opportunities,
      published,
      llm,
      ids,
      events,
      clock,
    );

    await handler.execute(runReasoningPassCommand({ tenantId: TENANT_ID }));
    const secondRun = await handler.execute(runReasoningPassCommand({ tenantId: TENANT_ID }));

    expect(secondRun.conceptsFound).toBe(0);
    const allConcepts = await concepts.listByTenant(TENANT_ID);
    expect(allConcepts).toHaveLength(1);
    expect(allConcepts[0]?.mentionCount).toBe(1);
  });

  it('queries historical publishing performance and includes it in the opportunity proposal prompt', async () => {
    const knowledgeReads = new FakeKnowledgeReadModel([
      knowledgeAsset('11111111-1111-1111-1111-111111111111', 'doc-1'),
    ]);
    const documentReads = new FakeDocumentReadModel(
      new Map([['doc-1', document('doc-1', 'Notes about scaling Redis in production.')]]),
    );
    const concepts = new FakeConceptRepository();
    const mentions = new FakeConceptMentionRepository();
    const relationships = new FakeConceptRelationshipRepository();
    const insights = new FakeInsightRepository();
    const opportunities = new FakeOpportunityRepository();
    const published = new FakePublishedContentRepository();
    
    // Seed an opportunity and a published content record for it
    const opportunityId = '33333333-3333-3333-3333-333333333333' as UUID;
    const mockOpportunity = {
      getId: () => ({ value: () => opportunityId }),
      tenantId: TENANT_ID,
      type: { value: 'blog_post' },
    } as unknown;
    await opportunities.save(mockOpportunity as unknown as Opportunity);
    
    const mockPublished = {
      tenantId: TENANT_ID,
      opportunityId,
      viewCount: 150,
    } as unknown;
    await published.save(mockPublished as unknown as PublishedContent);

    const llm = new ScriptedLlmCompletionPort();

    const handler = new RunReasoningPassHandler(
      knowledgeReads,
      documentReads,
      concepts,
      mentions,
      relationships,
      insights,
      opportunities,
      published,
      llm,
      ids,
      events,
      clock,
    );

    await handler.execute(runReasoningPassCommand({ tenantId: TENANT_ID }));

    // Verify that the prompt sent to the LLM contains our performance history
    const proposePrompt = llm.calls.find((prompt) => prompt.includes('historical performance'));
    expect(proposePrompt).toBeDefined();
    expect(proposePrompt).toContain('Opportunity Type "blog_post": 1 published, average views = 150');
  });
});
