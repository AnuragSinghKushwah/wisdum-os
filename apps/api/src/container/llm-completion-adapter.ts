import type { LlmCompletionOptions, LlmCompletionPort } from '@wisdum/application';
import { describeAiFailure } from './ai-check.js';
import type { LlmProvider } from '@wisdum/platform-ai';

/** Default output budget; some models spend part of it thinking, so it is generous. */
const MAX_OUTPUT_TOKENS = 4096;

const TRUNCATION_NOTICE =
  '⚠ The model stopped at its output limit, so this draft may end abruptly. Edit it, or create it again.';

/**
 * Fallback port that returns deterministic, highly realistic mock responses
 * for concept extraction, opportunity proposal, and drafting.
 * Bypasses the need for OpenAI/Anthropic API keys during offline testing.
 */
export class MockLlmCompletionPort implements LlmCompletionPort {
  readonly isMock = true;

  async complete(prompt: string): Promise<string> {
    const lower = prompt.toLowerCase();

    // 1. Concept Extraction Prompt
    if (prompt.includes('Extract 2 to 5 core concepts')) {
      return JSON.stringify([
        {
          name: 'Knowledge Operations',
          description: 'The practice of capturing, structuring, and using knowledge to drive business outcomes and leverage.',
        },
        {
          name: 'AI Operating System',
          description: 'An execution runtime using language models as reasoning engines over context-rich organization assets.',
        },
      ]);
    }

    // 2. Opportunity Generation Prompt (Dynamic based on prompt topic words)
    if (prompt.includes('propose 1 to 3')) {
      if (
        lower.includes('scale') ||
        lower.includes('postgres') ||
        lower.includes('database') ||
        lower.includes('redis') ||
        lower.includes('code') ||
        lower.includes('architecture')
      ) {
        return JSON.stringify([
          {
            title: 'Designing Multi-Tenant Vector Architectures',
            type: 'architecture_document',
            rationale: 'A technical blueprint on scaling pgvector and database isolation structures for SaaS platforms.',
          },
          {
            title: 'How to scale Redis under write-heavy workloads',
            type: 'blog_post',
            rationale: 'An engineering post detailing caching structures and connection pools under heavy load.',
          },
          {
            title: 'Visual Guide: Why Caching in Redis Fails at Scale',
            type: 'youtube_script',
            rationale: 'A video script outlining cache stampedes and connection pool exhaustion with simple visual animations.',
          },
          {
            title: 'Why Static Wikis Kill Developer Leverage',
            type: 'linkedin_post',
            rationale: 'A slide carousel deck summarizing cache stampede solutions for LinkedIn feeds.',
          },
          {
            title: 'Wisdum Weekly: Scaling AI Knowledge Systems',
            type: 'newsletter',
            rationale: 'A weekly newsletter detailing how database operations feed into knowledge graph reasoning passes.',
          },
        ]);
      }
      if (
        lower.includes('sales') ||
        lower.includes('marketing') ||
        lower.includes('customer') ||
        lower.includes('roi') ||
        lower.includes('pricing')
      ) {
        return JSON.stringify([
          {
            title: 'Interactive Social Launch Campaign for Wisdum OS',
            type: 'marketing_campaign',
            rationale: 'A multi-channel campaign layout mapping organic search interest to user acquisition goals.',
          },
          {
            title: 'Enterprise Value Proposition and ROI Checklist',
            type: 'sales_content',
            rationale: 'A collateral document to help enterprise buyers justify investment in Knowledge Operations.',
          },
        ]);
      }
      if (
        lower.includes('learn') ||
        lower.includes('guide') ||
        lower.includes('tutorial') ||
        lower.includes('teach') ||
        lower.includes('course')
      ) {
        return JSON.stringify([
          {
            title: 'Mastering Concept Graph Reasoning Protocols',
            type: 'course_module',
            rationale: 'An educational guide showing engineers how to write pattern extractors and domain events.',
          },
          {
            title: 'Teaching Machines to Think in Graphs',
            type: 'podcast_outline',
            rationale: 'An outline for an audio episode explaining graph reasoning and semantic co-occurrence.',
          },
        ]);
      }
      // General Fallback
      return JSON.stringify([
        {
          title: 'Designing Multi-Tenant Vector Architectures',
          type: 'architecture_document',
          rationale: 'A technical blueprint on scaling pgvector and database isolation structures for SaaS platforms.',
        },
        {
          title: 'How to scale Redis under write-heavy workloads',
          type: 'blog_post',
          rationale: 'An engineering post detailing caching structures and connection pools under heavy load.',
        },
        {
          title: 'Visual Guide: Why Caching in Redis Fails at Scale',
          type: 'youtube_script',
          rationale: 'A video script outlining cache stampedes and connection pool exhaustion with simple visual animations.',
        },
        {
          title: 'Why Static Wikis Kill Developer Leverage',
          type: 'linkedin_post',
          rationale: 'A slide carousel deck summarizing cache stampede solutions for LinkedIn feeds.',
        },
        {
          title: 'Wisdum Weekly: Scaling AI Knowledge Systems',
          type: 'newsletter',
          rationale: 'A weekly newsletter detailing how database operations feed into knowledge graph reasoning passes.',
        },
      ]);
    }

    // 3. Fallback/Content Drafting Prompt (Dynamic based on draft opportunity type)
    const isCarousel = lower.includes('linkedin_post') || lower.includes('linkedin post') || lower.includes('marketing_campaign') || lower.includes('marketing campaign') || lower.includes('carousel');
    const isScript = lower.includes('youtube_script') || lower.includes('youtube script') || lower.includes('podcast_outline') || lower.includes('podcast outline');

    if (isCarousel) {
      return [
        '---',
        'title: "Why Your Static Company Wiki is a Productivity Graveyard"',
        'seo_description: "A carousel layout showing why wikis fail and how active reasoning improves leverage."',
        'seo_keywords: "SaaS, Knowledge Management, Developer Leverage"',
        'target_audience: "Product Managers and engineering teams"',
        '---',
        '',
        '# SLIDE 1: The Company Wiki is Dead 🪦',
        'Most wikis are static graveyards.',
        'Information goes in, but never comes out.',
        'Employees spend hours search-hunting for facts.',
        '',
        '---',
        '',
        '# SLIDE 2: The Search Problem 🔍',
        'Search is reactive.',
        'You have to know what to search for.',
        'If you don\'t know the context exists, you never find it.',
        '',
        '---',
        '',
        '# SLIDE 3: Enter Knowledge Operations 🧠',
        'A Knowledge OS observes concept co-occurrences.',
        'It identifies hidden connections in the background.',
        'It proposes creation opportunities proactively.',
        '',
        '---',
        '',
        '# SLIDE 4: The Result 🚀',
        'Fewer duplicate meetings.',
        'Faster engineering onboarding.',
        'Continuous self-improvement.',
      ].join('\n');
    }

    if (isScript) {
      return [
        '---',
        'title: "How I Built a Self-Improving Knowledge OS"',
        'seo_description: "Video script detailing the build of a concept-graph reasoning system."',
        'seo_keywords: "Next.js, Fastify, AI OS, developer vlogs"',
        'target_audience: "Indie hackers and AI enthusiasts"',
        '---',
        '',
        '# [0:00 - 0:30] Hook & Intro',
        '**[Visual: Fast-paced overlay of code editing and graph visualizations]**',
        '*Host (Energetic):* Ever feel like your notes go to die in a black hole? Today, we are changing that. We\'re building a system that reads your notes, finds concept relationships, and drafts content for you.',
        '',
        '# [0:30 - 2:00] The Architecture',
        '**[Visual: Screen share of docker-compose and Fastify kernel composition]**',
        '*Host:* We use Fastify, PostgreSQL with pgvector, and a clean tactical domain architecture. Here is how the event pipeline flows.',
        '',
        '# [2:00 - 3:00] Outro & CTA',
        '**[Visual: Call to action banner linking to the GitHub repo]**',
        '*Host:* Check the description for the repo link, and don\'t forget to like and subscribe!',
      ].join('\n');
    }

    // Default: Blog / Newsletter / Document
    return [
      '---',
      'title: "The Rise of the Knowledge Operating System"',
      'seo_description: "How AI-native Knowledge Operating Systems continuously transform information into leverage."',
      'seo_keywords: "AI OS, Knowledge Operations, Developer Productivity"',
      'target_audience: "Engineering Leaders and Architects"',
      '---',
      '',
      '# The Rise of the Knowledge Operating System',
      '',
      '## Outline',
      '* Introduction',
      '* From Wikis to Active Reasoning',
      '* System Flow & Architecture',
      '* Conclusion',
      '',
      '## Introduction',
      'Historically, Knowledge Management was a passive graveyard of text. Wikis go to die, Slack logs disappear, and Git history is forgotten. A Knowledge Operating System turns this passive storage into an active reasoning assistant.',
      '',
      '## System Flow & Architecture',
      'The architecture of an AI OS centers on graph co-occurrences of concepts derived from document ingestion.',
      '',
      '```mermaid',
      'graph LR',
      '  A[Capture Connector] --> B[Observe Concepts]',
      '  B --> C[Connect Relationships]',
      '  C --> D[Reason & Generate Drafts]',
      '```',
      '',
      '## Conclusion',
      'Moving forward, organizations will compete based on the velocity of their reasoning loop, not the size of their document store.',
    ].join('\n');
  }
}

export function createLlmCompletionPort(
  provider: LlmProvider | undefined,
  model: string | undefined,
  providerName = 'the AI provider',
): LlmCompletionPort {
  return provider !== undefined && model !== undefined
    ? new LlmCompletionAdapter(provider, model, providerName)
    : new MockLlmCompletionPort();
}

/** Adapts the vendor-neutral `LlmProvider` (platform/ai) to the application layer's `LlmCompletionPort`. */
export class LlmCompletionAdapter implements LlmCompletionPort {
  constructor(
    private readonly provider: LlmProvider,
    private readonly model: string,
    private readonly providerName = 'the AI provider',
  ) {}

  async complete(prompt: string, options: LlmCompletionOptions = {}): Promise<string> {
    // A provider failure is reported as what to do about it, not as a raw status code and JSON body.
    const result = await this.provider
      .complete({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: options.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
      })
      .catch((error: unknown) => {
        throw new Error(describeAiFailure(error, { name: this.providerName, model: this.model }));
      });
    if (options.markTruncation === true && result.finishReason === 'length') {
      return `${result.content.trimEnd()}\n\n${TRUNCATION_NOTICE}`;
    }
    return result.content;
  }
}
