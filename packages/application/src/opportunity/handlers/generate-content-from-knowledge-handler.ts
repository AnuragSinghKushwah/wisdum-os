import {
  Insight,
  InsightId,
  InsightSummary,
  Opportunity,
  OpportunityId,
  OpportunityRationale,
  OpportunityTitle,
  OpportunityType,
} from '@wisdum/domain';
import type { Clock, InsightRepository, OpportunityRepository } from '@wisdum/domain';
import type { UUID } from '@wisdum/types';
import { ConfigurationError, ValidationError } from '@wisdum/errors';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DomainEventPublisher, IdGenerator, LlmCompletionPort } from '../../shared/ports.js';
import type { KnowledgeReadModel } from '../../knowledge/ports/knowledge-read-model.js';
import type { GenerateContentDraftCommand } from '../commands/generate-content-draft-command.js';
import type { GenerateContentFromKnowledgeCommand } from '../commands/generate-content-from-knowledge-command.js';
import type { SourceMaterialLoader } from '../services/source-material-loader.js';

/** The outcome for one requested platform. A failure on one platform never blocks the others. */
export interface PlatformContentResult {
  readonly platform: string;
  readonly opportunityId: string;
  /** Present when the draft was written. */
  readonly draftId?: string;
  /** Present when drafting failed; the opportunity stays `proposed` and can be retried. */
  readonly error?: string;
}

export interface GenerateContentFromKnowledgeResult {
  readonly results: readonly PlatformContentResult[];
}

/** Most platforms one request can target, to bound the model calls it fans out into. */
export const MAX_PLATFORMS_PER_REQUEST = 6;

/** Human-readable names used in opportunity titles so several drafts of one asset stay distinguishable. */
const PLATFORM_LABELS: Readonly<Record<string, string>> = {
  linkedin_post: 'LinkedIn post',
  x_thread: 'X thread',
  newsletter: 'Newsletter',
  blog_post: 'Blog post',
  youtube_script: 'YouTube script',
  podcast_outline: 'Podcast outline',
};

function labelFor(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform.replace(/_/g, ' ');
}

/**
 * The direct path through the Core Loop's Create step: the author picks a
 * knowledge asset and the platforms they want, and gets one grounded draft
 * per platform — without waiting for reasoning to discover opportunities.
 *
 * Each platform becomes an Opportunity linked, through one shared Insight, to
 * the source asset; drafting then reads that asset's text. Refuses to run
 * against the offline mock model, because canned text is not written from the
 * source and presenting it as such would be fabrication.
 */
export class GenerateContentFromKnowledgeHandler implements CommandHandler<
  GenerateContentFromKnowledgeCommand,
  GenerateContentFromKnowledgeResult
> {
  constructor(
    private readonly knowledge: KnowledgeReadModel,
    private readonly sources: SourceMaterialLoader,
    private readonly opportunities: OpportunityRepository,
    private readonly insights: InsightRepository,
    private readonly drafting: CommandHandler<GenerateContentDraftCommand, { draftId: string }>,
    private readonly llm: LlmCompletionPort,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: GenerateContentFromKnowledgeCommand,
  ): Promise<GenerateContentFromKnowledgeResult> {
    const platforms = this.validatePlatforms(command.platforms);

    const asset = await this.knowledge.findById(command.tenantId, command.knowledgeId);
    if (asset === undefined) {
      throw new NotFoundError('Knowledge asset not found', { knowledgeId: command.knowledgeId });
    }

    if (this.llm.isMock === true) {
      throw new ConfigurationError(
        'No AI provider is configured, so content cannot be written from your source. ' +
          'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY or OLLAMA_HOST and restart the API.',
      );
    }

    const loaded = await this.sources.load(command.tenantId, [asset.id]);
    if (loaded.length === 0) {
      throw new ValidationError(
        'This asset has no text to write from yet. Add content to it first.',
        { knowledgeId: asset.id },
      );
    }

    const insight = Insight.create(
      {
        id: InsightId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        summary: InsightSummary.create(`Content created from "${asset.title}".`),
        conceptIds: [],
        sourceKnowledgeIds: [asset.id as UUID],
      },
      this.clock,
    );
    await this.insights.save(insight);
    await this.events.publishAll(insight.pullDomainEvents());
    insight.clearDomainEvents();

    const created: { platform: string; opportunityId: string }[] = [];
    for (const platform of platforms) {
      const opportunity = Opportunity.create(
        {
          id: OpportunityId.create(this.ids.nextId()),
          tenantId: command.tenantId,
          insightId: insight.getId().value(),
          title: OpportunityTitle.create(`${labelFor(platform)}: ${asset.title}`.slice(0, 300)),
          rationale: OpportunityRationale.create(
            `A ${labelFor(platform).toLowerCase()} written from your own material, "${asset.title}".`,
          ),
          type: OpportunityType.create(platform),
        },
        this.clock,
      );
      await this.opportunities.save(opportunity);
      await this.events.publishAll(opportunity.pullDomainEvents());
      opportunity.clearDomainEvents();
      created.push({ platform, opportunityId: opportunity.getId().value() });
    }

    const settled = await Promise.allSettled(
      created.map(({ opportunityId }) =>
        this.drafting.execute({
          kind: 'command',
          tenantId: command.tenantId,
          opportunityId,
          ...(command.instructions !== undefined ? { instructions: command.instructions } : {}),
        }),
      ),
    );

    const results = created.map(({ platform, opportunityId }, index): PlatformContentResult => {
      const outcome = settled[index];
      if (outcome?.status === 'fulfilled') {
        return { platform, opportunityId, draftId: outcome.value.draftId };
      }
      const reason = outcome?.status === 'rejected' ? outcome.reason : undefined;
      return {
        platform,
        opportunityId,
        error: reason instanceof Error ? reason.message : 'Drafting failed.',
      };
    });
    return { results };
  }

  private validatePlatforms(requested: readonly string[]): readonly string[] {
    const unique = [...new Set(requested)];
    if (unique.length === 0) {
      throw new ValidationError('Choose at least one platform.');
    }
    if (unique.length > MAX_PLATFORMS_PER_REQUEST) {
      throw new ValidationError(
        `Choose at most ${MAX_PLATFORMS_PER_REQUEST} platforms per request.`,
        { requested: unique.length },
      );
    }
    for (const platform of unique) OpportunityType.create(platform); // throws on an unknown type
    return unique;
  }
}
