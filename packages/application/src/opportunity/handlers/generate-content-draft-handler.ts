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
  const normType = type.toLowerCase();
  let formatInstructions = '';

  if (normType === 'youtube_script') {
    formatInstructions = `This is a TELEPROMPTER VIDEO SCRIPT for YouTube. Structure it with:
1. **YAML Frontmatter**: title, video_duration ("10-12 mins"), target_audience, keywords, thumbnail_idea.
2. **Video Intro & Hook (00:00 - 01:30)**: Attention-grabbing opening statement, problem overview, and subscribe callout.
3. **Scene Breakdown & Visual Cues**: For each section, use:
   - \`[Timestamp: 00:00]\`
   - \`[Visual Cue: B-roll showing X / Screen Recording of Y / Motion Graphic Z]\`
   - \`[Host Dialogue]: Spoken transcript lines for the presenter.\`
4. **Key Takeaways & Summary (08:00 - 10:00)**: Final recap.
5. **Call to Action (CTA)**: Specific subscribe, comment, and link click prompt.
6. **YouTube Video Description & Tags**: Copy-pasteable YouTube description box text and comma-separated tags.`;
  } else if (normType === 'podcast_outline') {
    formatInstructions = `This is a PODCAST SHOW OUTLINE & SCRIPT. Structure it with:
1. **YAML Frontmatter**: show_name, episode_title, duration, target_listeners.
2. **Episode Intro & Hook**: Cold open audio clip, show intro, topic announcement.
3. **Segment Timestamps**:
   - \`[00:00 - Segment 1: Context & Problem Setup]\`
   - \`[05:00 - Segment 2: Deep Dive & Discussion Prompts]\`
   - \`[15:00 - Segment 3: Practical Takeaways & Q&A]\`
4. **Host Talking Points & Guest Discussion Prompts**: Bulleted prompts and quotes.
5. **Outro & Sponsor Reads**: Mid-roll/outro message and social handles.`;
  } else if (normType === 'linkedin_post') {
    formatInstructions = `This is a LINKEDIN CAROUSEL & POST PACKAGE. Structure it with:
1. **YAML Frontmatter**: format ("Carousel + Post"), target_audience, slide_count.
2. **LinkedIn Post Copy**: Hook sentence (first 2 lines before "see more"), short punchy body paragraphs, bullet points, and 5 relevant hashtags.
3. **Slide-by-Slide Carousel Breakdown**:
   - \`### Slide 1: Cover (Hook Title + Subtitle)\`
   - \`### Slide 2: The Problem\`
   - \`### Slide 3-5: Step-by-Step Insights / Visual Diagram Breakdown\`
   - \`### Slide 6: Summary & CTA (Follow + Repost)\`
4. **Engagement Question**: End with a conversation starter.`;
  } else if (normType === 'newsletter') {
    formatInstructions = `This is an EMAIL NEWSLETTER EDITION. Structure it with:
1. **YAML Frontmatter**: subject_line_options (3 variants), preheader_text, read_time.
2. **Subject Line A/B Test Options**: 3 distinct high-open-rate subject lines.
3. **Personal Greeting & Opening Story**: Engaging editorial intro.
4. **Core Insight / Main Lesson**: Deep breakdown of the topic with actionable tips.
5. **Quick Links / Resource Recommendations**: 3 curated links or key takeaways.
6. **Footer Call to Action**: Reply trigger, feedback poll, or subscription forward link.`;
  } else if (normType === 'architecture_document') {
    formatInstructions = `This is an ENGINEERING ARCHITECTURE SPECIFICATION (ADR / RFC). Structure it with:
1. **YAML Frontmatter**: status ("Proposed / Accepted"), authors, date, domain.
2. **Executive Summary & Context**: Background and technical problem description.
3. **System Architecture Diagram (Mermaid)**: Valid \`\`\`mermaid sequenceDiagram or flowchart TD\`\`\` block.
4. **Component Responsibilities & Data Boundaries**: Data models, tables, and API endpoints.
5. **Trade-offs & Alternatives Considered**: Pros vs cons analysis.
6. **Security & Performance Considerations**: Latency, auth, scaling metrics.`;
  } else if (normType === 'trading_report') {
    formatInstructions = `This is a TRADING & MARKET ANALYSIS REPORT. Structure it with:
1. **YAML Frontmatter**: asset_pair, market_bias ("Bullish/Bearish/Neutral"), timeframe, risk_level.
2. **Executive Summary**: Core market thesis and price action setup.
3. **Technical Pattern & Key Levels**: Resistance, support, liquidity pools, moving averages.
4. **Trade Execution Parameters**:
   - Entry Range
   - Stop Loss Level
   - Take Profit Targets (TP1, TP2, TP3)
   - Risk-to-Reward Ratio (RRR)
5. **Macro & Fundamental Drivers**: Underlying catalysts.
6. **Risk Management Warning**: Mandatory risk disclaimer.`;
  } else if (normType === 'course_module') {
    formatInstructions = `This is an EDUCATIONAL COURSE MODULE. Structure it with:
1. **YAML Frontmatter**: module_title, difficulty_level, estimated_time, prerequisites.
2. **Learning Objectives**: 3-5 clear "After this module, you will be able to..." outcomes.
3. **Core Lesson Text**: In-depth concepts with code or visual examples.
4. **Hands-On Lab / Practical Exercise**: Step-by-step student exercise.
5. **Knowledge Check Quiz**: 3 multiple-choice questions with answer explanations.`;
  } else if (normType === 'product_specification') {
    formatInstructions = `This is a PRODUCT REQUIREMENTS DOCUMENT (PRD). Structure it with:
1. **YAML Frontmatter**: prd_title, owner, status, target_release.
2. **Problem Statement & User Needs**: Why build this feature.
3. **User Stories & Acceptance Criteria**: Given/When/Then scenarios.
4. **Functional & Non-Functional Requirements**: Detailed specs.
5. **Edge Cases & Out of Scope**: Boundaries and potential error states.`;
  } else {
    formatInstructions = `This is a structured Markdown document. Structure it with:
1. **YAML Frontmatter**: title, seo_description, seo_keywords, target_audience.
2. **Table of Contents / Outline**: Bulleted section overview.
3. **Detailed Body Sections**: Comprehensive analysis and evidence.
4. **Code Snippets or Diagrams**: If applicable, provide concrete examples.
5. **Conclusion & References**: Summary and source citations.`;
  }

  return [
    `Write a comprehensive, professional first draft, in Markdown, for a "${type.replace(/_/g, ' ')}" titled "${title}".`,
    `Why this content is valuable/necessary: ${rationale}`,
    insightSummary !== undefined ? `Source knowledge observation: ${insightSummary}` : undefined,
    formatInstructions,
    'Return only the raw Markdown content — do not wrap in backticks or include any pre- or post-commentary outside the Markdown document.'
  ]
    .filter((line): line is string => line !== undefined && line.trim().length > 0)
    .join('\n\n');
}
