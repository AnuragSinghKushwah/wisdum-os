import { ContentBody, ContentDraftId, InsightId, OpportunityId } from '@wisdum/domain';
import type {
  Clock,
  ContentDraftRepository,
  InsightRepository,
  OpportunityRepository,
} from '@wisdum/domain';
import { ConfigurationError, ValidationError } from '@wisdum/errors';
import type { CommandHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { RegenerateContentDraftCommand } from '../commands/regenerate-content-draft-command.js';
import type { DraftWriter } from '../services/draft-writer.js';

/**
 * Writes a draft's text again from the author's source and replaces the current text, keeping the
 * draft's id, title and opportunity. For when a draft came out wrong and the author wants another go
 * without creating a second draft. It overwrites the body, so the caller is expected to have asked.
 * A published draft is not touched: the published page would no longer match it.
 */
export class RegenerateContentDraftHandler implements CommandHandler<
  RegenerateContentDraftCommand,
  { draftId: string }
> {
  constructor(
    private readonly opportunities: OpportunityRepository,
    private readonly insights: InsightRepository,
    private readonly drafts: ContentDraftRepository,
    private readonly writer: DraftWriter,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegenerateContentDraftCommand): Promise<{ draftId: string }> {
    const foundDraft = await this.drafts.findById(ContentDraftId.create(command.draftId));
    if (!foundDraft.some || foundDraft.value.tenantId !== command.tenantId) {
      throw new NotFoundError('Content draft not found', { draftId: command.draftId });
    }
    const draft = foundDraft.value;
    if (draft.status.value !== 'draft') {
      throw new ValidationError(
        'This draft is published, so it cannot be written again. Edit it, or create new content from the source.',
        { draftId: command.draftId },
      );
    }
    if (this.writer.usesMockModel) {
      throw new ConfigurationError(
        'No AI provider is configured, so the draft cannot be written again. ' +
          'Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, NVIDIA_API_KEY or OLLAMA_HOST and restart the API.',
      );
    }

    const foundOpportunity = await this.opportunities.findById(
      OpportunityId.create(draft.opportunityId),
    );
    if (!foundOpportunity.some || foundOpportunity.value.tenantId !== command.tenantId) {
      throw new NotFoundError('The opportunity this draft belongs to was not found', {
        draftId: command.draftId,
      });
    }
    const opportunity = foundOpportunity.value;
    const foundInsight = await this.insights.findById(InsightId.create(opportunity.insightId));
    const insight = foundInsight.some ? foundInsight.value : undefined;

    const bodyText = await this.writer.write({
      tenantId: command.tenantId,
      title: opportunity.title.value,
      rationale: opportunity.rationale.value,
      type: opportunity.type.value,
      insightSummary: insight?.summary.value,
      sourceKnowledgeIds: insight?.sourceKnowledgeIds ?? [],
      instructions: command.instructions,
    });

    draft.updateContent(draft.title, ContentBody.create(bodyText), this.clock);
    await this.drafts.save(draft);
    return { draftId: draft.getId().value() };
  }
}
