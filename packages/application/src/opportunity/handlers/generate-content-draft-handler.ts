import {
  ContentBody,
  ContentDraft,
  ContentDraftId,
  ContentTitle,
  InsightId,
  OpportunityId,
} from '@wisdum/domain';
import type {
  ContentDraftRepository,
  InsightRepository,
  OpportunityRepository,
} from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { DomainEventPublisher, IdGenerator, LlmCompletionPort } from '../../shared/ports.js';
import type { GenerateContentDraftCommand } from '../commands/generate-content-draft-command.js';
import { buildDraftPrompt } from '../prompts/draft-prompt.js';
import type { SourceMaterialLoader } from '../services/source-material-loader.js';

/** Room for a full first draft (a long blog post or script runs to a few thousand words). */
const DRAFT_MAX_OUTPUT_TOKENS = 4096;

/**
 * The Create step (Product Bible §9): generates a first Markdown draft for
 * a proposed opportunity, then marks the opportunity `drafted`.
 *
 * The draft is written from the author's own material: the opportunity's
 * insight lists the knowledge assets it came from, and their text goes into
 * the prompt. An opportunity with no linked source falls back to its title,
 * rationale and insight summary alone.
 */
export class GenerateContentDraftHandler implements CommandHandler<
  GenerateContentDraftCommand,
  { draftId: string }
> {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly insights: InsightRepository,
    private readonly drafts: ContentDraftRepository,
    private readonly llm: LlmCompletionPort,
    private readonly sources: SourceMaterialLoader,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: GenerateContentDraftCommand): Promise<{ draftId: string }> {
    const found = await this.opportunities.findById(OpportunityId.create(command.opportunityId));
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Opportunity not found', { opportunityId: command.opportunityId });
    }
    const opportunity = found.value;

    const foundInsight = await this.insights.findById(InsightId.create(opportunity.insightId));
    const insight = foundInsight.some ? foundInsight.value : undefined;
    const sources = await this.sources.load(command.tenantId, insight?.sourceKnowledgeIds ?? []);

    const bodyText = await this.llm.complete(
      buildDraftPrompt({
        title: opportunity.title.value,
        rationale: opportunity.rationale.value,
        type: opportunity.type.value,
        insightSummary: insight?.summary.value,
        sources,
        instructions: command.instructions,
      }),
      { maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS },
    );

    const draft = ContentDraft.create(
      {
        id: ContentDraftId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        opportunityId: opportunity.getId().value(),
        title: ContentTitle.create(opportunity.title.value),
        body: ContentBody.create(bodyText),
      },
      this.clock,
    );
    await this.drafts.save(draft);
    await this.events.publishAll(draft.pullDomainEvents());
    draft.clearDomainEvents();

    opportunity.markDrafted(draft.getId().value(), this.clock);
    await this.opportunities.save(opportunity);
    await this.events.publishAll(opportunity.pullDomainEvents());
    opportunity.clearDomainEvents();

    return { draftId: draft.getId().value() };
  }
}
