import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
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
import type {
  Clock,
  ContentDraft,
  ContentDraftId,
  ContentDraftRepository,
  InsightRepository,
  OpportunityRepository,
} from '@wisdum/domain';
import { ConfigurationError, ValidationError } from '@wisdum/errors';
import type { DocumentDto } from '../../../document/dto/document-dto.js';
import type { DocumentReadModel } from '../../../document/ports/document-read-model.js';
import type { KnowledgeDto } from '../../../knowledge/dto/knowledge-dto.js';
import type { KnowledgeReadModel } from '../../../knowledge/ports/knowledge-read-model.js';
import { NotFoundError } from '../../../shared/errors.js';
import type {
  DomainEventPublisher,
  IdGenerator,
  LlmCompletionOptions,
  LlmCompletionPort,
} from '../../../shared/ports.js';
import { generateContentDraftCommand } from '../../commands/generate-content-draft-command.js';
import { generateContentFromKnowledgeCommand } from '../../commands/generate-content-from-knowledge-command.js';
import { SourceMaterialLoader } from '../../services/source-material-loader.js';
import { GenerateContentDraftHandler } from '../generate-content-draft-handler.js';
import { GenerateContentFromKnowledgeHandler } from '../generate-content-from-knowledge-handler.js';

const TENANT = 'tenant-a' as TenantId;
const OTHER_TENANT = 'tenant-b' as TenantId;
const clock: Clock = { now: () => '2026-10-10T00:00:00.000Z' as IsoTimestamp };
const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };

const SOURCE_TEXT =
  'Retrying without backoff turns a small outage into a large one. A client that retries every second hammers a ' +
  'struggling service. Exponential backoff with jitter spreads the load, and giving up loudly after a few attempts ' +
  'beats retrying forever.';

function makeIds(): IdGenerator {
  let counter = 0;
  return {
    nextId: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}` as UUID;
    },
  };
}

class MapRepository<T extends { getId(): { value(): string } }> {
  protected readonly items = new Map<string, T>();
  save(item: T): Promise<void> {
    this.items.set(item.getId().value(), item);
    return Promise.resolve();
  }
  delete(item: T): Promise<void> {
    this.items.delete(item.getId().value());
    return Promise.resolve();
  }
  exists(id: { value(): string }): Promise<boolean> {
    return Promise.resolve(this.items.has(id.value()));
  }
  all(): readonly T[] {
    return [...this.items.values()];
  }
  protected find(id: { value(): string }): Promise<Option<T>> {
    const item = this.items.get(id.value());
    return Promise.resolve(item ? { some: true, value: item } : { some: false });
  }
}

class FakeInsights extends MapRepository<Insight> implements InsightRepository {
  findById(id: InsightId): Promise<Option<Insight>> {
    return this.find(id);
  }
}

class FakeOpportunities extends MapRepository<Opportunity> implements OpportunityRepository {
  findById(id: OpportunityId): Promise<Option<Opportunity>> {
    return this.find(id);
  }
  listByTenant(tenantId: TenantId): Promise<readonly Opportunity[]> {
    return Promise.resolve(this.all().filter((o) => o.tenantId === tenantId));
  }
}

class FakeDrafts extends MapRepository<ContentDraft> implements ContentDraftRepository {
  findById(id: ContentDraftId): Promise<Option<ContentDraft>> {
    return this.find(id);
  }
  findByOpportunityId(tenantId: TenantId, opportunityId: string): Promise<Option<ContentDraft>> {
    const found = this.all().find(
      (d) => d.tenantId === tenantId && d.opportunityId === opportunityId,
    );
    return Promise.resolve(found ? { some: true, value: found } : { some: false });
  }
  listByTenant(tenantId: TenantId): Promise<readonly ContentDraft[]> {
    return Promise.resolve(this.all().filter((d) => d.tenantId === tenantId));
  }
}

interface SeededAsset {
  readonly tenantId: TenantId;
  readonly id: string;
  readonly title: string;
  readonly text: string;
}

/** Tenant-aware fakes: an id from another tenant resolves to nothing, as the real read models do. */
class FakeKnowledge implements KnowledgeReadModel {
  constructor(private readonly assets: readonly SeededAsset[]) {}
  findById(tenantId: TenantId, knowledgeId: string): Promise<KnowledgeDto | undefined> {
    const asset = this.assets.find((a) => a.id === knowledgeId && a.tenantId === tenantId);
    return Promise.resolve(
      asset === undefined
        ? undefined
        : ({
            id: asset.id,
            title: asset.title,
            contentReferences: [{ reference: `doc-${asset.id}`, mimeType: 'text/plain' }],
          } as unknown as KnowledgeDto),
    );
  }
  listByTenant(): Promise<readonly KnowledgeDto[]> {
    return Promise.resolve([]);
  }
}

class FakeDocuments implements DocumentReadModel {
  constructor(private readonly assets: readonly SeededAsset[]) {}
  findById(tenantId: TenantId, documentId: string): Promise<DocumentDto | undefined> {
    const asset = this.assets.find((a) => `doc-${a.id}` === documentId && a.tenantId === tenantId);
    return Promise.resolve(
      asset === undefined ? undefined : ({ id: documentId, content: asset.text } as DocumentDto),
    );
  }
}

class RecordingLlm implements LlmCompletionPort {
  readonly prompts: string[] = [];
  readonly options: (LlmCompletionOptions | undefined)[] = [];
  constructor(
    private readonly respond: (prompt: string) => string = () => '# A draft',
    readonly isMock?: boolean,
  ) {}
  complete(prompt: string, options?: LlmCompletionOptions): Promise<string> {
    this.prompts.push(prompt);
    this.options.push(options);
    try {
      return Promise.resolve(this.respond(prompt));
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

const ASSET: SeededAsset = {
  tenantId: TENANT,
  id: 'asset-1',
  title: 'Retries without backoff',
  text: SOURCE_TEXT,
};

function build(
  options: { assets?: readonly SeededAsset[]; llm?: LlmCompletionPort; budgetChars?: number } = {},
) {
  const assets = options.assets ?? [ASSET];
  const llm = options.llm ?? new RecordingLlm();
  const ids = makeIds();
  const insights = new FakeInsights();
  const opportunities = new FakeOpportunities();
  const drafts = new FakeDrafts();
  const knowledge = new FakeKnowledge(assets);
  const sources = new SourceMaterialLoader(
    knowledge,
    new FakeDocuments(assets),
    options.budgetChars,
  );
  const drafting = new GenerateContentDraftHandler(
    opportunities,
    insights,
    drafts,
    llm,
    sources,
    ids,
    events,
    clock,
  );
  const fromKnowledge = new GenerateContentFromKnowledgeHandler(
    knowledge,
    sources,
    opportunities,
    insights,
    drafting,
    llm,
    ids,
    events,
    clock,
  );
  return { fromKnowledge, drafting, insights, opportunities, drafts, ids, sources };
}

describe('SourceMaterialLoader', () => {
  it('returns the text of assets in the tenant and skips ones that are missing or foreign', async () => {
    const foreign: SeededAsset = {
      ...ASSET,
      id: 'asset-2',
      tenantId: OTHER_TENANT,
      text: 'secret',
    };
    const { sources } = build({ assets: [ASSET, foreign] });

    const loaded = await sources.load(TENANT, ['asset-1', 'asset-2', 'missing']);

    expect(loaded.map((s) => s.knowledgeId)).toEqual(['asset-1']);
    expect(loaded[0]?.text).toBe(SOURCE_TEXT);
    expect(loaded[0]?.truncated).toBe(false);
  });

  it('splits the budget across sources and cuts long text at a sentence end', async () => {
    const long = `${'First sentence is here. '.repeat(40)}`.trim();
    const second: SeededAsset = { ...ASSET, id: 'asset-2', title: 'Second', text: long };
    const first: SeededAsset = { ...ASSET, text: long };
    const assets = [first, second];
    const knowledge = new FakeKnowledge(assets);
    const loader = new SourceMaterialLoader(knowledge, new FakeDocuments(assets), 400);

    const loaded = await loader.load(TENANT, ['asset-1', 'asset-2']);

    expect(loaded).toHaveLength(2);
    for (const excerpt of loaded) {
      expect(excerpt.text.length).toBeLessThanOrEqual(200);
      expect(excerpt.truncated).toBe(true);
      expect(excerpt.text.endsWith('.')).toBe(true);
    }
  });
});

describe('GenerateContentDraftHandler grounding', () => {
  async function opportunityWithSource(
    ctx: ReturnType<typeof build>,
    sourceKnowledgeIds: readonly string[],
    tenantId: TenantId = TENANT,
    type = 'linkedin_post',
  ): Promise<string> {
    const insight = Insight.create(
      {
        id: InsightId.create(ctx.ids.nextId()),
        tenantId,
        summary: InsightSummary.create('An observation.'),
        conceptIds: [],
        sourceKnowledgeIds: sourceKnowledgeIds as unknown as readonly UUID[],
      },
      clock,
    );
    await ctx.insights.save(insight);
    const opportunity = Opportunity.create(
      {
        id: OpportunityId.create(ctx.ids.nextId()),
        tenantId,
        insightId: insight.getId().value(),
        title: OpportunityTitle.create('A title'),
        rationale: OpportunityRationale.create('A reason'),
        type: OpportunityType.create(type),
      },
      clock,
    );
    await ctx.opportunities.save(opportunity);
    return opportunity.getId().value();
  }

  it('puts the linked source text and the grounding rules into the prompt', async () => {
    const llm = new RecordingLlm();
    const ctx = build({ llm });
    const opportunityId = await opportunityWithSource(ctx, ['asset-1']);

    await ctx.drafting.execute(
      generateContentDraftCommand({
        tenantId: TENANT,
        opportunityId,
        instructions: 'Aim at engineering leads',
      }),
    );

    const prompt = llm.prompts[0] ?? '';
    expect(prompt).toContain(SOURCE_TEXT);
    expect(prompt).toContain('SOURCE MATERIAL');
    expect(prompt).toContain('GROUNDING RULES');
    expect(prompt).toContain('Do not invent statistics');
    expect(prompt).toContain('Aim at engineering leads');
  });

  it('asks the model for enough room to write a full draft', async () => {
    const llm = new RecordingLlm();
    const ctx = build({ llm });
    const opportunityId = await opportunityWithSource(ctx, ['asset-1']);

    await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

    expect(llm.options[0]?.maxOutputTokens).toBeGreaterThanOrEqual(4000);
  });

  it('writes without a source block when the insight links no source', async () => {
    const llm = new RecordingLlm();
    const ctx = build({ llm });
    const opportunityId = await opportunityWithSource(ctx, []);

    await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

    expect(llm.prompts[0]).not.toContain('SOURCE MATERIAL');
    expect(llm.prompts[0]).not.toContain('GROUNDING RULES');
  });

  it('never reads a source that belongs to another tenant', async () => {
    const foreign: SeededAsset = { ...ASSET, tenantId: OTHER_TENANT, text: 'OTHER-TENANT-SECRET' };
    const llm = new RecordingLlm();
    const ctx = build({ assets: [foreign], llm });
    const opportunityId = await opportunityWithSource(ctx, ['asset-1']);

    await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

    expect(llm.prompts[0]).not.toContain('OTHER-TENANT-SECRET');
  });

  it("treats another tenant's opportunity as not found", async () => {
    const ctx = build();
    const opportunityId = await opportunityWithSource(ctx, ['asset-1'], OTHER_TENANT);

    await expect(
      ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  describe('an X thread', () => {
    const LONG_POST = `3/ ${'This explanation keeps going well past what X will accept in one post. '.repeat(6).trim()}`;
    const FITTING = '1/ A hook.\n\n2/ A short point.\n\n3/ A takeaway.';
    const posts = (body: string | undefined): string[] =>
      (body ?? '').split('\n\n').map((post) => post.trim());

    it('is saved exactly as written, with a single request, when every post fits', async () => {
      const llm = new RecordingLlm(() => FITTING);
      const ctx = build({ llm });
      const opportunityId = await opportunityWithSource(ctx, ['asset-1'], TENANT, 'x_thread');

      await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

      expect(llm.prompts).toHaveLength(1);
      expect(ctx.drafts.all()[0]?.body.value).toBe(FITTING);
    });

    it('has its long posts split in code, not by asking the model again, and renumbered in order', async () => {
      const llm = new RecordingLlm(
        () => `1/ A hook.\n\n2/ A point.\n\n${LONG_POST}\n\n4/ The end.`,
      );
      const ctx = build({ llm });
      const opportunityId = await opportunityWithSource(ctx, ['asset-1'], TENANT, 'x_thread');

      await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

      const saved = posts(ctx.drafts.all()[0]?.body.value);
      expect(llm.prompts).toHaveLength(1);
      expect(saved.length).toBeGreaterThan(4);
      expect(saved.every((post) => post.length <= 280)).toBe(true);
      expect(saved.map((post) => /^\d+/.exec(post)?.[0])).toEqual(
        saved.map((_post, index) => String(index + 1)),
      );
      expect(saved.at(-1)).toBe(`${saved.length}/ The end.`);
    });

    it("leaves the offline demo model's sample text as it is", async () => {
      const llm = new RecordingLlm(() => LONG_POST, true);
      const ctx = build({ llm });
      const opportunityId = await opportunityWithSource(ctx, ['asset-1'], TENANT, 'x_thread');

      await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

      expect(ctx.drafts.all()[0]?.body.value).toBe(LONG_POST);
    });

    it('is the only format held to the post limit', async () => {
      const llm = new RecordingLlm(() => 'x'.repeat(2000));
      const ctx = build({ llm });
      const opportunityId = await opportunityWithSource(ctx, ['asset-1'], TENANT, 'blog_post');

      await ctx.drafting.execute(generateContentDraftCommand({ tenantId: TENANT, opportunityId }));

      expect(ctx.drafts.all()[0]?.body.value).toBe('x'.repeat(2000));
    });
  });
});

describe('GenerateContentFromKnowledgeHandler', () => {
  it('creates one source-linked opportunity and one grounded draft per platform', async () => {
    const llm = new RecordingLlm();
    const ctx = build({ llm });

    const { results } = await ctx.fromKnowledge.execute(
      generateContentFromKnowledgeCommand({
        tenantId: TENANT,
        knowledgeId: 'asset-1',
        platforms: ['linkedin_post', 'newsletter', 'x_thread'],
      }),
    );

    expect(results.map((r) => r.platform)).toEqual(['linkedin_post', 'newsletter', 'x_thread']);
    expect(results.every((r) => r.draftId !== undefined && r.error === undefined)).toBe(true);
    expect(ctx.insights.all()).toHaveLength(1);
    expect(ctx.insights.all()[0]?.sourceKnowledgeIds).toEqual(['asset-1']);
    expect(ctx.opportunities.all().map((o) => o.status.value)).toEqual([
      'drafted',
      'drafted',
      'drafted',
    ]);
    expect(ctx.opportunities.all().map((o) => o.title.value)).toEqual([
      'LinkedIn post: Retries without backoff',
      'Newsletter: Retries without backoff',
      'X thread: Retries without backoff',
    ]);
    expect(ctx.drafts.all()).toHaveLength(3);

    expect(llm.prompts).toHaveLength(3);
    for (const prompt of llm.prompts) expect(prompt).toContain(SOURCE_TEXT);
    expect(llm.prompts.some((p) => p.includes('LINKEDIN POST'))).toBe(true);
    expect(llm.prompts.some((p) => p.includes('EMAIL NEWSLETTER'))).toBe(true);
    expect(llm.prompts.some((p) => p.includes('X (TWITTER) THREAD'))).toBe(true);
  });

  it('says when the source is longer than it can read, and only then', async () => {
    const long = { ...ASSET, text: `${'A full sentence about retries. '.repeat(200)}`.trim() };
    const command = (assets: readonly SeededAsset[]) => ({
      tenantId: TENANT,
      knowledgeId: 'asset-1',
      platforms: ['linkedin_post'],
      assets,
    });

    const cut = build({ assets: [long], budgetChars: 500 });
    const cutResult = await cut.fromKnowledge.execute(
      generateContentFromKnowledgeCommand(command([long])),
    );
    const whole = build();
    const wholeResult = await whole.fromKnowledge.execute(
      generateContentFromKnowledgeCommand(command([ASSET])),
    );

    expect(cutResult.sourceTruncated).toBe(true);
    expect(wholeResult.sourceTruncated).toBe(false);
  });

  it('stores a draft the model wrapped in a code fence without the fence', async () => {
    const llm = new RecordingLlm(() => '```markdown\nA post about backoff.\n```');
    const ctx = build({ llm });

    await ctx.fromKnowledge.execute(
      generateContentFromKnowledgeCommand({
        tenantId: TENANT,
        knowledgeId: 'asset-1',
        platforms: ['linkedin_post'],
      }),
    );

    expect(ctx.drafts.all()[0]?.body.value).toBe('A post about backoff.');
  });

  it('reports a platform whose model answer is empty instead of saving a blank draft', async () => {
    const llm = new RecordingLlm(() => '   ');
    const ctx = build({ llm });

    const { results } = await ctx.fromKnowledge.execute(
      generateContentFromKnowledgeCommand({
        tenantId: TENANT,
        knowledgeId: 'asset-1',
        platforms: ['linkedin_post'],
      }),
    );

    expect(results[0]?.draftId).toBeUndefined();
    expect(results[0]?.error).toContain('empty draft');
    expect(ctx.drafts.all()).toHaveLength(0);
  });

  it('collapses duplicate platforms into one draft each', async () => {
    const llm = new RecordingLlm();
    const ctx = build({ llm });

    const { results } = await ctx.fromKnowledge.execute(
      generateContentFromKnowledgeCommand({
        tenantId: TENANT,
        knowledgeId: 'asset-1',
        platforms: ['newsletter', 'newsletter'],
      }),
    );

    expect(results).toHaveLength(1);
    expect(llm.prompts).toHaveLength(1);
  });

  it('reports a failed platform without losing the others, and keeps its opportunity to retry', async () => {
    const llm = new RecordingLlm((prompt) => {
      if (prompt.includes('EMAIL NEWSLETTER')) throw new Error('model overloaded');
      return '# ok';
    });
    const ctx = build({ llm });

    const { results } = await ctx.fromKnowledge.execute(
      generateContentFromKnowledgeCommand({
        tenantId: TENANT,
        knowledgeId: 'asset-1',
        platforms: ['linkedin_post', 'newsletter'],
      }),
    );

    const linkedin = results.find((r) => r.platform === 'linkedin_post');
    const newsletter = results.find((r) => r.platform === 'newsletter');
    expect(linkedin?.draftId).toBeDefined();
    expect(newsletter?.draftId).toBeUndefined();
    expect(newsletter?.error).toBe('model overloaded');
    const failed = ctx.opportunities.all().find((o) => o.type.value === 'newsletter');
    expect(failed?.status.value).toBe('proposed');
    expect(ctx.drafts.all()).toHaveLength(1);
  });

  it('refuses to write against the offline mock model and creates nothing', async () => {
    const ctx = build({ llm: new RecordingLlm(() => 'canned', true) });

    await expect(
      ctx.fromKnowledge.execute(
        generateContentFromKnowledgeCommand({
          tenantId: TENANT,
          knowledgeId: 'asset-1',
          platforms: ['linkedin_post'],
        }),
      ),
    ).rejects.toBeInstanceOf(ConfigurationError);
    expect(ctx.insights.all()).toHaveLength(0);
    expect(ctx.opportunities.all()).toHaveLength(0);
  });

  it('rejects an unknown, empty or oversized platform list', async () => {
    const ctx = build();
    const run = (platforms: readonly string[]) =>
      ctx.fromKnowledge.execute(
        generateContentFromKnowledgeCommand({
          tenantId: TENANT,
          knowledgeId: 'asset-1',
          platforms,
        }),
      );

    await expect(run(['myspace_post'])).rejects.toBeInstanceOf(ValidationError);
    await expect(run([])).rejects.toBeInstanceOf(ValidationError);
    await expect(
      run([
        'blog_post',
        'linkedin_post',
        'x_thread',
        'newsletter',
        'youtube_script',
        'podcast_outline',
        'course_module',
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("treats another tenant's asset as not found", async () => {
    const ctx = build({ assets: [{ ...ASSET, tenantId: OTHER_TENANT }] });

    await expect(
      ctx.fromKnowledge.execute(
        generateContentFromKnowledgeCommand({
          tenantId: TENANT,
          knowledgeId: 'asset-1',
          platforms: ['linkedin_post'],
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(ctx.opportunities.all()).toHaveLength(0);
  });

  it('asks for content first when the asset has no text, and creates nothing', async () => {
    const ctx = build({ assets: [{ ...ASSET, text: '   ' }] });

    await expect(
      ctx.fromKnowledge.execute(
        generateContentFromKnowledgeCommand({
          tenantId: TENANT,
          knowledgeId: 'asset-1',
          platforms: ['linkedin_post'],
        }),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(ctx.insights.all()).toHaveLength(0);
    expect(ctx.opportunities.all()).toHaveLength(0);
  });
});
