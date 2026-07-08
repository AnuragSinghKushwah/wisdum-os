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

/**
 * The Create step (Product Bible §9): generates a first Markdown draft for
 * a proposed opportunity from its title, rationale, and source insight —
 * then marks the opportunity `drafted`.
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
    const insightSummary = foundInsight.some ? foundInsight.value.summary.value : undefined;

    const bodyText = await this.llm.complete(
      buildDraftPrompt(
        opportunity.title.value,
        opportunity.rationale.value,
        opportunity.type.value,
        insightSummary,
      ),
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

function buildDraftPrompt(
  title: string,
  rationale: string,
  type: string,
  insightSummary: string | undefined,
): string {
  return [
    `Write a first draft, in Markdown, for a "${type.replace(/_/g, ' ')}" titled "${title}".`,
    `Why this is worth writing: ${rationale}`,
    insightSummary !== undefined ? `Source observation: ${insightSummary}` : undefined,
    'Return only the Markdown body — no surrounding commentary.',
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n\n');
}
