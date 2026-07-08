import {
  Concept,
  ConceptDescription,
  ConceptId,
  ConceptMention,
  ConceptMentionId,
  ConceptName,
  ConceptRelationship,
  ConceptRelationshipId,
  ConceptRelationshipType,
  Insight,
  InsightId,
  InsightSummary,
  Opportunity,
  OpportunityId,
  OpportunityRationale,
  OpportunityTitle,
  OpportunityType,
} from '@wisdum/domain';
import type {
  Clock,
  ConceptMentionRepository,
  ConceptRelationshipRepository,
  ConceptRepository,
  InsightRepository,
  OpportunityRepository,
} from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import type { DocumentReadModel } from '../../document/index.js';
import type { KnowledgeReadModel } from '../../knowledge/index.js';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator, LlmCompletionPort } from '../../shared/ports.js';
import type { RunReasoningPassCommand } from '../commands/run-reasoning-pass-command.js';
import type { ReasoningResultDto } from '../dto/reasoning-result-dto.js';
import { extractJsonArray } from '../llm-json.js';

const PATTERN_OCCURRENCE_THRESHOLD = 2;
/** Caps LLM calls per pass when nothing crosses the pattern threshold yet. */
const MAX_FALLBACK_CONCEPTS = 5;

interface ExtractedConcept {
  readonly name: string;
  readonly description: string;
}

interface ProposedOpportunity {
  readonly title: string;
  readonly type: string;
  readonly rationale: string;
}

/**
 * Orchestrates one manually-triggered pass of the Core Loop's Observe ->
 * Understand -> Connect -> Reason -> Insight -> Opportunity steps (Product
 * Bible §5). Deliberately not a domain bounded context — it legitimately
 * spans Knowledge, Document, graph, and opportunity, which is an
 * application-layer orchestration concern, not a single aggregate's
 * behavior.
 */
export class RunReasoningPassHandler implements CommandHandler<
  RunReasoningPassCommand,
  ReasoningResultDto
> {
  constructor(
    private readonly knowledgeReads: KnowledgeReadModel,
    private readonly documentReads: DocumentReadModel,
    private readonly concepts: ConceptRepository,
    private readonly mentions: ConceptMentionRepository,
    private readonly relationships: ConceptRelationshipRepository,
    private readonly insights: InsightRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly llm: LlmCompletionPort,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: RunReasoningPassCommand): Promise<ReasoningResultDto> {
    const { tenantId } = command;
    let conceptsFound = 0;

    const knowledgeAssets = (await this.knowledgeReads.listByTenant(tenantId)).filter(
      (asset) => asset.contentReferences.length > 0,
    );

    for (const asset of knowledgeAssets) {
      const reference = asset.contentReferences[0];
      if (reference === undefined) continue;
      const document = await this.documentReads.findById(reference.reference);
      if (document === undefined || document.content.trim().length === 0) continue;

      const extracted = await this.extractConcepts(document.content);
      const assetConceptIds: ConceptId[] = [];
      let assetHasNewActivity = false;

      for (const item of extracted) {
        const name = ConceptName.create(item.name);
        const { concept, isNew } = await this.upsertConcept(tenantId, name, item.description);
        if (isNew) conceptsFound += 1;
        assetConceptIds.push(concept.getId());

        const mentionIsNew = await this.recordMentionIfNew(
          tenantId,
          concept,
          asset.id as unknown as UUID,
        );
        if (mentionIsNew) assetHasNewActivity = true;
      }

      if (assetHasNewActivity && assetConceptIds.length >= 2) {
        await this.recordCoOccurrences(tenantId, assetConceptIds);
      }
    }

    const allRelationships = await this.relationships.listByTenant(tenantId);
    const patterns = allRelationships.filter(
      (relationship) => relationship.occurrenceCount >= PATTERN_OCCURRENCE_THRESHOLD,
    );

    let insightsCreated = 0;
    let opportunitiesCreated = 0;

    if (patterns.length > 0) {
      for (const pattern of patterns) {
        const created = await this.generateInsightAndOpportunities(tenantId, {
          conceptIds: [pattern.conceptAId, pattern.conceptBId],
          describeFor: async () => {
            const [a, b] = await Promise.all([
              this.concepts.findById(pattern.conceptAId),
              this.concepts.findById(pattern.conceptBId),
            ]);
            if (!a.some || !b.some) return undefined;
            return `"${a.value.name.value}" and "${b.value.name.value}" recur together across ${pattern.occurrenceCount} knowledge assets.`;
          },
        });
        insightsCreated += created.insightsCreated;
        opportunitiesCreated += created.opportunitiesCreated;
      }
    } else {
      const allConcepts = (await this.concepts.listByTenant(tenantId))
        .filter((concept) => concept.mentionCount >= 1)
        .slice(0, MAX_FALLBACK_CONCEPTS);
      for (const concept of allConcepts) {
        const created = await this.generateInsightAndOpportunities(tenantId, {
          conceptIds: [concept.getId()],
          describeFor: () =>
            Promise.resolve(
              `"${concept.name.value}" has been captured but not yet connected to anything else — an early observation worth acting on.`,
            ),
        });
        insightsCreated += created.insightsCreated;
        opportunitiesCreated += created.opportunitiesCreated;
      }
    }

    return { conceptsFound, insightsCreated, opportunitiesCreated };
  }

  // ── Understand ─────────────────────────────────────────────────────────

  private async extractConcepts(content: string): Promise<readonly ExtractedConcept[]> {
    const prompt = [
      'Extract 2 to 5 core concepts or topics from the following text.',
      'Respond with only a JSON array, no commentary, in this exact shape:',
      '[{"name": "string", "description": "one sentence"}]',
      '',
      content.slice(0, 8000),
    ].join('\n');
    const response = await this.llm.complete(prompt);
    return extractJsonArray(response).filter(isExtractedConcept);
  }

  // ── Connect ────────────────────────────────────────────────────────────

  private async upsertConcept(
    tenantId: RunReasoningPassCommand['tenantId'],
    name: ConceptName,
    description: string,
  ): Promise<{ concept: Concept; isNew: boolean }> {
    const existing = await this.concepts.findByName(tenantId, name);
    if (existing.some) {
      return { concept: existing.value, isNew: false };
    }
    const concept = Concept.create(
      {
        id: ConceptId.create(this.ids.nextId()),
        tenantId,
        name,
        description: ConceptDescription.create(description),
      },
      this.clock,
    );
    await this.concepts.save(concept);
    await this.events.publishAll(concept.pullDomainEvents());
    concept.clearDomainEvents();
    return { concept, isNew: true };
  }

  private async recordMentionIfNew(
    tenantId: RunReasoningPassCommand['tenantId'],
    concept: Concept,
    knowledgeId: UUID,
  ): Promise<boolean> {
    const existing = await this.mentions.findExisting(tenantId, concept.getId(), knowledgeId);
    if (existing.some) return false;

    const mention = ConceptMention.create(
      {
        id: ConceptMentionId.create(this.ids.nextId()),
        tenantId,
        conceptId: concept.getId(),
        knowledgeId,
      },
      this.clock,
    );
    await this.mentions.save(mention);
    await this.events.publishAll(mention.pullDomainEvents());
    mention.clearDomainEvents();

    concept.recordMention(this.clock);
    await this.concepts.save(concept);
    return true;
  }

  private async recordCoOccurrences(
    tenantId: RunReasoningPassCommand['tenantId'],
    conceptIds: readonly ConceptId[],
  ): Promise<void> {
    const unique = dedupeConceptIds(conceptIds);
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        const first = unique[i];
        const second = unique[j];
        if (first === undefined || second === undefined) continue;
        const [a, b] = orderPair(first, second);
        await this.upsertRelationship(tenantId, a, b);
      }
    }
  }

  private async upsertRelationship(
    tenantId: RunReasoningPassCommand['tenantId'],
    conceptAId: ConceptId,
    conceptBId: ConceptId,
  ): Promise<void> {
    const relationshipType = ConceptRelationshipType.coOccurs();
    const existing = await this.relationships.findExisting(
      tenantId,
      conceptAId,
      conceptBId,
      relationshipType,
    );
    if (existing.some) {
      existing.value.recordOccurrence(this.clock);
      await this.relationships.save(existing.value);
      return;
    }
    const relationship = ConceptRelationship.create(
      {
        id: ConceptRelationshipId.create(this.ids.nextId()),
        tenantId,
        conceptAId,
        conceptBId,
        relationshipType,
      },
      this.clock,
    );
    await this.relationships.save(relationship);
    await this.events.publishAll(relationship.pullDomainEvents());
    relationship.clearDomainEvents();
  }

  // ── Reason -> Insight -> Opportunity ────────────────────────────────────

  private async generateInsightAndOpportunities(
    tenantId: RunReasoningPassCommand['tenantId'],
    pattern: {
      readonly conceptIds: readonly ConceptId[];
      readonly describeFor: () => Promise<string | undefined>;
    },
  ): Promise<{ insightsCreated: number; opportunitiesCreated: number }> {
    const summaryText = await pattern.describeFor();
    if (summaryText === undefined) return { insightsCreated: 0, opportunitiesCreated: 0 };

    const sourceKnowledgeIds = await this.sourceKnowledgeIdsFor(tenantId, pattern.conceptIds);

    const insight = Insight.create(
      {
        id: InsightId.create(this.ids.nextId()),
        tenantId,
        summary: InsightSummary.create(summaryText),
        conceptIds: pattern.conceptIds.map((id) => id.value()),
        sourceKnowledgeIds,
      },
      this.clock,
    );
    await this.insights.save(insight);
    await this.events.publishAll(insight.pullDomainEvents());
    insight.clearDomainEvents();

    const proposed = await this.proposeOpportunities(summaryText);
    let opportunitiesCreated = 0;
    for (const item of proposed) {
      try {
        const opportunity = Opportunity.create(
          {
            id: OpportunityId.create(this.ids.nextId()),
            tenantId,
            insightId: insight.getId().value(),
            title: OpportunityTitle.create(item.title),
            rationale: OpportunityRationale.create(item.rationale),
            type: OpportunityType.create(item.type),
          },
          this.clock,
        );
        await this.opportunities.save(opportunity);
        await this.events.publishAll(opportunity.pullDomainEvents());
        opportunity.clearDomainEvents();
        opportunitiesCreated += 1;
      } catch {
        // Malformed or unrecognized type from the model — skip this one
        // proposal rather than failing the whole reasoning pass.
      }
    }

    return { insightsCreated: 1, opportunitiesCreated };
  }

  private async proposeOpportunities(
    insightSummary: string,
  ): Promise<readonly ProposedOpportunity[]> {
    const prompt = [
      'Given this observation about a person\'s captured knowledge, propose 1 to 3',
      'concrete content opportunities they could create.',
      'Respond with only a JSON array, no commentary, in this exact shape:',
      '[{"title": "string", "type": "blog_post|linkedin_post|newsletter|youtube_script|course_module|book_chapter|architecture_document|research_paper|podcast_outline|trading_report|internal_documentation|product_specification|marketing_campaign|sales_content", "rationale": "one sentence"}]',
      '',
      `Observation: ${insightSummary}`,
    ].join('\n');
    const response = await this.llm.complete(prompt);
    return extractJsonArray(response).filter(isProposedOpportunity);
  }

  private async sourceKnowledgeIdsFor(
    tenantId: RunReasoningPassCommand['tenantId'],
    conceptIds: readonly ConceptId[],
  ): Promise<readonly UUID[]> {
    const knowledgeIds = new Set<UUID>();
    for (const conceptId of conceptIds) {
      const mentions = await this.mentions.listByConcept(tenantId, conceptId);
      for (const mention of mentions) {
        knowledgeIds.add(mention.knowledgeId as UUID);
      }
    }
    return [...knowledgeIds];
  }
}

function dedupeConceptIds(conceptIds: readonly ConceptId[]): readonly ConceptId[] {
  const seen = new Map<string, ConceptId>();
  for (const id of conceptIds) {
    seen.set(id.value(), id);
  }
  return [...seen.values()];
}

function orderPair(a: ConceptId, b: ConceptId): readonly [ConceptId, ConceptId] {
  return a.value() < b.value() ? [a, b] : [b, a];
}

function isExtractedConcept(value: unknown): value is ExtractedConcept {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).name === 'string' &&
    typeof (value as Record<string, unknown>).description === 'string'
  );
}

function isProposedOpportunity(value: unknown): value is ProposedOpportunity {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).title === 'string' &&
    typeof (value as Record<string, unknown>).type === 'string' &&
    typeof (value as Record<string, unknown>).rationale === 'string'
  );
}
