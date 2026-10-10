import type { TenantId } from '@wisdum/types';
import type { DocumentReadModel } from '../../document/ports/document-read-model.js';
import type { KnowledgeReadModel } from '../../knowledge/ports/knowledge-read-model.js';

/** One knowledge asset's text, cut to fit the model's prompt budget. */
export interface SourceExcerpt {
  readonly knowledgeId: string;
  readonly title: string;
  readonly text: string;
  /** True when the asset has more text than was included. */
  readonly truncated: boolean;
}

/** Total characters of source text sent per draft (about 15k tokens), shared across sources. */
export const DEFAULT_SOURCE_BUDGET_CHARS = 60_000;

/**
 * Reads the text of knowledge assets so a draft can be written from what the
 * author actually captured. Lookups go through the tenant-scoped read models,
 * so an asset from another tenant resolves to nothing and is never included.
 */
export class SourceMaterialLoader {
  constructor(
    private readonly knowledge: KnowledgeReadModel,
    private readonly documents: DocumentReadModel,
    private readonly budgetChars: number = DEFAULT_SOURCE_BUDGET_CHARS,
  ) {}

  /**
   * Returns an excerpt for every asset that exists in the tenant and has
   * readable text, skipping the rest. The budget is split evenly so one long
   * asset cannot crowd out the others.
   */
  async load(
    tenantId: TenantId,
    knowledgeIds: readonly string[],
  ): Promise<readonly SourceExcerpt[]> {
    const unique = [...new Set(knowledgeIds)];
    if (unique.length === 0) return [];
    const perSource = Math.floor(this.budgetChars / unique.length);

    const excerpts: SourceExcerpt[] = [];
    for (const knowledgeId of unique) {
      const asset = await this.knowledge.findById(tenantId, knowledgeId);
      if (asset === undefined) continue;

      const parts: string[] = [];
      for (const reference of asset.contentReferences) {
        const document = await this.documents.findById(tenantId, reference.reference);
        const text = document?.content.trim() ?? '';
        if (text.length > 0) parts.push(text);
      }
      const full = parts.join('\n\n');
      if (full.length === 0) continue;

      const { text, truncated } = cutAtBoundary(full, perSource);
      excerpts.push({ knowledgeId, title: asset.title, text, truncated });
    }
    return excerpts;
  }
}

/** Cuts to `limit` characters, preferring the last paragraph or sentence end in the final fifth. */
function cutAtBoundary(text: string, limit: number): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  const window = text.slice(0, limit);
  const floor = Math.floor(limit * 0.8);
  const paragraph = window.lastIndexOf('\n\n');
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('.\n'));
  const cut = paragraph >= floor ? paragraph : sentence >= floor ? sentence + 1 : limit;
  return { text: window.slice(0, cut).trimEnd(), truncated: true };
}
