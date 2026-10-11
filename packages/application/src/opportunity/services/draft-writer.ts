import type { TenantId } from '@wisdum/types';
import type { LlmCompletionPort } from '../../shared/ports.js';
import { buildDraftPrompt } from '../prompts/draft-prompt.js';
import { cleanModelOutput } from './clean-model-output.js';
import { buildDraftReviewPrompt, judgeReview } from './draft-review.js';
import type { SourceExcerpt, SourceMaterialLoader } from './source-material-loader.js';
import { fitThread } from './x-thread.js';

/**
 * Room for a full first draft plus any thinking the model does first: some models spend part of
 * this budget thinking (Claude counts thinking tokens toward the limit), and a long blog post or
 * script runs to a few thousand words. Only tokens actually produced are billed.
 */
const DRAFT_MAX_OUTPUT_TOKENS = 16_000;

export interface DraftWriterOptions {
  /**
   * Have the model check each draft against its source and take out what the source does not
   * support. One more request per draft. Off unless enabled.
   */
  readonly reviewDrafts?: boolean;
  /** Told why a draft was saved unreviewed (the review failed, or its result was not usable). */
  readonly onReviewSkipped?: (reason: string) => void;
}

/** What a draft is written from. */
export interface DraftWriteRequest {
  readonly tenantId: TenantId;
  readonly title: string;
  readonly rationale: string;
  readonly type: string;
  readonly insightSummary: string | undefined;
  /** The knowledge assets whose text the draft is written from; may be empty. */
  readonly sourceKnowledgeIds: readonly string[];
  /** Free-text steer from the author, e.g. the angle or audience. */
  readonly instructions: string | undefined;
}

/**
 * Writes the text of a draft: loads the author's source, asks the model, has it checked against the
 * source, and fits the result to the platform. Shared by creating a draft and regenerating one, so
 * both behave the same.
 */
export class DraftWriter {
  constructor(
    private readonly llm: LlmCompletionPort,
    private readonly sources: SourceMaterialLoader,
    private readonly options: DraftWriterOptions = {},
  ) {}

  /** True when the model is the offline demo one, which only returns canned sample text. */
  get usesMockModel(): boolean {
    return this.llm.isMock === true;
  }

  async write(request: DraftWriteRequest): Promise<string> {
    const sources = await this.sources.load(request.tenantId, request.sourceKnowledgeIds);

    const rawBody = await this.llm.complete(
      buildDraftPrompt({
        title: request.title,
        rationale: request.rationale,
        type: request.type,
        insightSummary: request.insightSummary,
        sources,
        instructions: request.instructions,
      }),
      { maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS, markTruncation: true },
    );
    let bodyText = cleanModelOutput(rawBody);
    if (bodyText.length === 0) {
      throw new Error('The model returned an empty draft. Try again.');
    }
    if (this.options.reviewDrafts === true && sources.length > 0 && !this.usesMockModel) {
      bodyText = await this.reviewAgainstSources(sources, bodyText);
    }
    // X rejects a post over 280 characters and models write them anyway, so long posts are split in
    // code. The offline demo model's canned sample text is left as it is.
    if (request.type === 'x_thread' && !this.usesMockModel) {
      bodyText = fitThread(bodyText);
    }
    return bodyText;
  }

  /**
   * Has the model take out what the source does not support. A review that fails, or that comes back
   * unusable, leaves the draft as first written and says why; it never fails the draft.
   */
  private async reviewAgainstSources(
    sources: readonly SourceExcerpt[],
    draft: string,
  ): Promise<string> {
    try {
      const reviewed = cleanModelOutput(
        await this.llm.complete(buildDraftReviewPrompt(sources, draft), {
          maxOutputTokens: DRAFT_MAX_OUTPUT_TOKENS,
          markTruncation: true,
        }),
      );
      const verdict = judgeReview(draft, reviewed);
      if (verdict.accepted) return verdict.text;
      this.options.onReviewSkipped?.(verdict.reason);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.options.onReviewSkipped?.(`the review failed: ${reason}`);
    }
    return draft;
  }
}
