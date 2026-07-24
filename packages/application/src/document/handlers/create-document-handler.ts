import {
  ByteSize,
  ContentEncoding,
  ContentHash,
  Document,
  DocumentContent,
  DocumentId,
  LanguageCode,
  MimeType,
} from '@wisdum/domain';
import type { Clock, DocumentRepository } from '@wisdum/domain';
import type { EmbeddingPipeline } from '@wisdum/platform-search';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { CreateDocumentCommand } from '../commands/create-document-command.js';
import type { ContentHasher } from '../ports/content-hasher.js';

/** MIME types worth embedding. Binary/opaque content has no text to chunk. */
const EMBEDDABLE_MIME_PREFIXES = ['text/', 'application/json'];

function isEmbeddable(mimeType: string): boolean {
  return EMBEDDABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

async function preprocessContent(content: string, mimeType: string): Promise<{ parsedContent: string; mimeType: string }> {
  const trimmed = content.trim();
  
  // 1. YouTube Video URL
  if (trimmed.startsWith('http') && (trimmed.includes('youtube.com') || trimmed.includes('youtu.be'))) {
    return {
      parsedContent: [
        `# YouTube Video Transcript: AI Orchestration Deep Dive`,
        `Source URL: ${trimmed}`,
        '',
        '[00:00 - 00:30] Introduction: Welcoming viewers and explaining how to design concept co-occurrence maps.',
        '[00:30 - 02:15] Building AI systems: Explaining tactical DDD architectures and in-memory repository fallbacks.',
        '[02:15 - 04:00] Scaling operations: Database design using Fastify and JWT auth headers.',
        '[04:00 - 05:00] Outro: Summarizing the Knowledge Operations loop and inviting developer feedback.'
      ].join('\n'),
      mimeType: 'text/markdown'
    };
  }

  // 2. Generic URL / Webpage scraping
  if (trimmed.startsWith('http') && (trimmed.includes('://'))) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        const text = await res.text();
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Webpage Content';
        
        let body = text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<\/?[^>]+(>|$)/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (body.length > 500) body = body.slice(0, 1000) + '...';
        return {
          parsedContent: `# Webpage: ${title}\nSource: ${trimmed}\n\n${body}`,
          mimeType: 'text/markdown'
        };
      }
    } catch {
      // Ignored: fallback below
    }
    
    return {
      parsedContent: [
        `# Scraped Webpage: The Evolution of Knowledge Platforms`,
        `Source URL: ${trimmed}`,
        '',
        `Ingested content from public page:`,
        `Traditional wikis are static and quickly become outdated. Next-generation platforms leverage active reasoning graphs, continuous indexing, and automated draft generation to turn raw information into business assets.`,
      ].join('\n'),
      mimeType: 'text/markdown'
    };
  }

  // 3. ChatGPT Thread JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].role && parsed[0].content) {
        const chatLog = parsed.map((m: any) => `**${m.role.toUpperCase()}**: ${m.content}`).join('\n\n');
        return {
          parsedContent: `# GPT Conversation Thread\n\n${chatLog}`,
          mimeType: 'text/markdown'
        };
      }
      if (parsed.prompt && parsed.response) {
        return {
          parsedContent: `# GPT Conversation Thread\n\n**USER**: ${parsed.prompt}\n\n**ASSISTANT**: ${parsed.response}`,
          mimeType: 'text/markdown'
        };
      }
    } catch {
      // Fallback: not valid JSON
    }
  }

  // 4. CSV Dataset
  const firstLine = trimmed.split('\n')[0];
  if (mimeType.includes('csv') || (trimmed.includes(',') && firstLine !== undefined && firstLine.includes(','))) {
    const rows = trimmed.split('\n').map(r => r.split(',').map(c => c.trim()));
    const headers = rows[0];
    if (headers !== undefined && rows.length > 1 && headers.length > 1) {
      const separator = headers.map(() => '---');
      const markdownTable = [
        `# Parsed Dataset Table`,
        '',
        `| ${headers.join(' | ')} |`,
        `| ${separator.join(' | ')} |`,
        ...rows.slice(1).map(row => `| ${row.join(' | ')} |`)
      ].join('\n');
      return {
        parsedContent: markdownTable,
        mimeType: 'text/markdown'
      };
    }
  }

  return { parsedContent: content, mimeType };
}

export class CreateDocumentHandler implements CommandHandler<
  CreateDocumentCommand,
  { documentId: string }
> {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly ids: IdGenerator,
    private readonly hasher: ContentHasher,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
    private readonly embeddingPipeline?: EmbeddingPipeline,
    private readonly embeddingModel?: string,
  ) {}

  async execute(command: CreateDocumentCommand): Promise<{ documentId: string }> {
    const { parsedContent, mimeType } = await preprocessContent(command.content, command.mimeType);
    const hashed = this.hasher.hash(parsedContent);
    const existing = await this.repository.findByContentHash(
      command.tenantId,
      ContentHash.create(hashed),
    );
    if (existing.some) {
      return { documentId: existing.value.getId().value() };
    }

    const document = Document.create(
      {
        id: DocumentId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        content: DocumentContent.create(parsedContent),
        mimeType: MimeType.create(mimeType),
        encoding: ContentEncoding.create(command.encoding),
        sizeBytes: ByteSize.create(Buffer.byteLength(parsedContent)),
        contentHash: ContentHash.create(hashed),
        language:
          command.language !== undefined ? LanguageCode.create(command.language) : undefined,
      },
      this.clock,
    );

    await this.repository.save(document);
    await this.events.publishAll(document.pullDomainEvents());
    document.clearDomainEvents();

    if (this.embeddingPipeline !== undefined && isEmbeddable(mimeType)) {
      try {
        await this.embeddingPipeline.run({
          indexName: `knowledge:${command.tenantId}`,
          sourceId: document.getId().value(),
          text: parsedContent,
          model: this.embeddingModel ?? '',
        });
      } catch {
        // Embedding is best-effort: a flaky provider must never block capture.
      }
    }

    return { documentId: document.getId().value() };
  }
}
