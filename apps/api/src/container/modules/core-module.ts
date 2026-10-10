import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createPgPool, migrateUp } from '@wisdum/database';
import { optionalEnv } from '@wisdum/config';
import { SystemClock } from '@wisdum/domain';
import { createLogger } from '@wisdum/logger';
import { resolveJwtSecret } from '../../config/jwt-secret.js';
import { checkAiProvider } from '../ai-check.js';
import { resolveRuntimeEnvironment } from '../../config/runtime-environment.js';
import {
  InMemoryEventBus,
  JwtTokenService,
  KebabSlugGenerator,
  RedisEventBus,
  UuidGenerator,
} from '@wisdum/infrastructure';
import { CapabilityRegistry } from '@wisdum/kernel';
import type { Container, KernelModule } from '@wisdum/kernel';
import type { EventBus } from '@wisdum/events';
import {
  AnthropicLlmProvider,
  OpenAiLlmProvider,
  OpenAiEmbeddingProvider,
  LocalEmbeddingProvider,
  createLazyLocalFeatureExtractor,
} from '@wisdum/platform-ai';
import { GeminiLlmProvider, OllamaLlmProvider, listGeminiModels } from '@wisdum/platform-ai';
import type { EmbeddingProvider, LlmProvider } from '@wisdum/platform-ai';
import type { InputConnector } from '@wisdum/platform-inputs';
import { DefaultEmbeddingPipeline, FixedSizeChunker, InMemoryVectorStore } from '@wisdum/platform-search';
import type { EmbeddingPipeline, VectorStore } from '@wisdum/platform-search';
import { PostgresVectorStore } from '@wisdum/infrastructure';
import { Redis } from 'ioredis';
import {
  CLOCK,
  EMBEDDING_MODEL,
  EMBEDDING_PIPELINE,
  EMBEDDING_PROVIDER,
  VECTOR_STORE,
  EVENT_BUS,
  ID_GENERATOR,
  INPUT_CONNECTORS,
  LLM_MODEL,
  LLM_PROVIDER,
  LLM_STATUS,
  PG_POOL,
  SLUG_GENERATOR,
  TOKEN_SERVICE,
} from '../tokens.js';
import type { LlmStatus } from '../tokens.js';

const DEFAULT_ANTHROPIC_MODEL = 'anthropic/claude-sonnet-5-5';
const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_OLLAMA_MODEL = 'ollama/llama3';

/** A configured model provider, the model to ask it for, and its short name for status reporting. */
export interface LlmSelection {
  readonly provider: LlmProvider;
  readonly model: string;
  readonly name: string;
  /** Lists the models this account can use, to help when the configured one is missing. */
  readonly listModels?: () => Promise<readonly string[]>;
}

/**
 * Picks a real `LlmProvider` (and a matching default model name) from
 * whichever provider is configured, in this order: Anthropic, OpenAI, Gemini,
 * then a local Ollama (`OLLAMA_HOST`). Shared by AiModule (chat) and ReasoningModule (one-shot
 * completions) — neither vendor SDK is referenced outside this composition
 * root. The model name is overridable via `REASONING_LLM_MODEL` since
 * exact available model ids drift over time.
 */
function createLlmProvider(): LlmSelection | undefined {
  const model = (fallback: string): string => optionalEnv('REASONING_LLM_MODEL', fallback);

  const anthropicKey = optionalEnv('ANTHROPIC_API_KEY', '');
  if (anthropicKey.length > 0) {
    const client = new Anthropic({ apiKey: anthropicKey });
    return {
      name: 'anthropic',
      provider: new AnthropicLlmProvider(client),
      model: model(DEFAULT_ANTHROPIC_MODEL),
      listModels: async () => (await client.models.list({ limit: 20 })).data.map((m) => m.id),
    };
  }
  const openAiKey = optionalEnv('OPENAI_API_KEY', '');
  if (openAiKey.length > 0) {
    const client = new OpenAI({ apiKey: openAiKey });
    return {
      name: 'openai',
      provider: new OpenAiLlmProvider(client),
      model: model(DEFAULT_OPENAI_MODEL),
      listModels: async () =>
        (await client.models.list()).data.map((m) => m.id).filter((id) => /^(gpt|o\d)/.test(id)),
    };
  }
  const geminiKey = optionalEnv('GEMINI_API_KEY', optionalEnv('GOOGLE_API_KEY', ''));
  if (geminiKey.length > 0) {
    return {
      name: 'gemini',
      provider: new GeminiLlmProvider({ apiKey: geminiKey }),
      // No built-in model: Gemini retires models on a schedule, so a default goes stale. The start-up
      // check lists what the key can use when this is empty or wrong.
      model: model(''),
      listModels: () => listGeminiModels(geminiKey),
    };
  }
  // Never probed: a local Ollama is used only when the operator points at it.
  const ollamaHost = optionalEnv('OLLAMA_HOST', '');
  if (ollamaHost.length > 0) {
    return {
      name: 'ollama',
      provider: new OllamaLlmProvider({ baseUrl: ollamaHost }),
      model: model(DEFAULT_OLLAMA_MODEL),
      listModels: async () => {
        const response = await fetch(`${ollamaHost.replace(/\/+$/, '')}/api/tags`);
        const data = (await response.json()) as { models?: { name?: string }[] };
        return (data.models ?? []).map((m) => m.name ?? '').filter((name) => name.length > 0);
      },
    };
  }
  return undefined;
}

const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_LOCAL_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const LOCAL_EMBEDDING_DIMENSIONS = 384;

/**
 * Picks an `EmbeddingProvider`: OpenAI when `OPENAI_API_KEY` is set,
 * otherwise a local, offline model run in-process via `@xenova/transformers`.
 * Unlike `createLlmProvider`, this never returns undefined — the local path
 * is a real fallback, not an absence, so uploads still get embedded on a
 * fully self-hosted deployment with no vendor key. The local model itself
 * loads lazily on first use (see `createLazyLocalFeatureExtractor`) rather
 * than here, since `register()` is synchronous and must not block kernel
 * startup on a multi-second model download.
 */
function createEmbeddingProvider(): {
  provider: OpenAiEmbeddingProvider | LocalEmbeddingProvider;
  model: string;
} {
  const openAiKey = optionalEnv('OPENAI_API_KEY', '');
  if (openAiKey.length > 0) {
    return {
      provider: new OpenAiEmbeddingProvider(new OpenAI({ apiKey: openAiKey })),
      model: optionalEnv('EMBEDDING_MODEL', DEFAULT_OPENAI_EMBEDDING_MODEL),
    };
  }
  const model = optionalEnv('LOCAL_EMBEDDING_MODEL', DEFAULT_LOCAL_EMBEDDING_MODEL);
  return {
    provider: new LocalEmbeddingProvider(
      createLazyLocalFeatureExtractor(model),
      LOCAL_EMBEDDING_DIMENSIONS,
    ),
    model,
  };
}

/**
 * Registers the shared singletons every other module depends on. When
 * `DATABASE_URL` is set, opens the Postgres pool and applies pending
 * migrations before any other module starts; when `REDIS_URL` is set, the
 * event bus fans events out through Redis Pub/Sub instead of dispatching
 * only in-process — required once the API runs as more than one instance.
 * Absent either variable, every domain module falls back to its in-memory
 * adapters (used for local development and tests without external services).
 */
export class CoreModule implements KernelModule {
  readonly name = 'core';
  private readonly redisClients: Redis[] = [];
  private selection: LlmSelection | undefined;
  private status: LlmStatus = { mode: 'mock' };

  /** `llm` replaces the environment-based provider choice; tests use it to supply a scripted model. */
  constructor(private readonly options: { readonly llm?: LlmSelection } = {}) {}

  register(container: Container): void {
    container.registerValue(CLOCK, SystemClock.instance());
    container.registerValue(ID_GENERATOR, new UuidGenerator());
    container.registerValue(SLUG_GENERATOR, new KebabSlugGenerator());
    container.registerValue(INPUT_CONNECTORS, new CapabilityRegistry<InputConnector>('InputConnector'));

    const redisUrl = optionalEnv('REDIS_URL', '');
    let eventBus: EventBus;
    if (redisUrl.length > 0) {
      const publisher = new Redis(redisUrl);
      const subscriber = new Redis(redisUrl);
      this.redisClients.push(publisher, subscriber);
      eventBus = new RedisEventBus(publisher, subscriber);
    } else {
      eventBus = new InMemoryEventBus();
    }
    container.registerValue(EVENT_BUS, eventBus);

    const databaseUrl = optionalEnv('DATABASE_URL', '');
    const pool = databaseUrl.length > 0 ? createPgPool({ url: databaseUrl }) : undefined;
    container.registerValue(PG_POOL, pool);

    const jwt = resolveJwtSecret(process.env['JWT_SECRET'], resolveRuntimeEnvironment());
    if (jwt.generated) {
      createLogger('core').warn(
        'JWT_SECRET is not set; signing tokens with a random per-process secret. Sessions will not survive a restart.',
      );
    }
    container.registerValue(TOKEN_SERVICE, new JwtTokenService(jwt.secret));

    const llm = this.options.llm ?? createLlmProvider();
    container.registerValue(LLM_PROVIDER, llm?.provider);
    container.registerValue(LLM_MODEL, llm?.model);
    this.selection = llm;
    // A provider supplied by the caller (a test) is never asked anything.
    const injected = this.options.llm !== undefined;
    this.status =
      llm === undefined
        ? { mode: 'mock' }
        : {
            mode: 'live',
            provider: llm.name,
            model: llm.model,
            check: { status: injected ? 'skipped' : 'pending' },
          };
    container.registerValue(LLM_STATUS, this.status);
    if (llm === undefined) {
      createLogger('core').warn(
        'No AI provider configured (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY or OLLAMA_HOST): reasoning and drafting return canned sample text and "create content from source" is disabled.',
      );
    }

    const embeddingEnabled = optionalEnv('EMBEDDING_ENABLED', 'true') !== 'false';
    let embeddingPipeline: EmbeddingPipeline | undefined;
    let embeddingModel: string | undefined;
    let embeddingProvider: EmbeddingProvider | undefined;
    let vectorStoreVal: VectorStore | undefined;
    if (embeddingEnabled) {
      const embedding = createEmbeddingProvider();
      const vectorStore = pool !== undefined ? new PostgresVectorStore(pool) : new InMemoryVectorStore();
      embeddingPipeline = new DefaultEmbeddingPipeline(
        new FixedSizeChunker(),
        embedding.provider,
        vectorStore,
      );
      embeddingModel = embedding.model;
      embeddingProvider = embedding.provider;
      vectorStoreVal = vectorStore;
    }
    container.registerValue(EMBEDDING_PIPELINE, embeddingPipeline);
    container.registerValue(EMBEDDING_MODEL, embeddingModel);
    container.registerValue(EMBEDDING_PROVIDER, embeddingProvider);
    container.registerValue(VECTOR_STORE, vectorStoreVal);
  }

  async start(container: Container): Promise<void> {
    const pool = container.resolve(PG_POOL);
    if (pool !== undefined) {
      await migrateUp(pool);
    }
    this.startAiCheck();
  }

  /**
   * Confirms in the background that the configured key and model work, so a bad key or a retired model
   * shows up in the log and on the dashboard instead of on someone's first draft. One tiny request;
   * `WISDUM_AI_CHECK=false` turns it off. Never delays or fails start-up.
   */
  private startAiCheck(): void {
    const { selection, status } = this;
    if (selection === undefined || status.mode !== 'live' || status.check.status !== 'pending') return;
    if (optionalEnv('WISDUM_AI_CHECK', 'true') === 'false') {
      status.check = { status: 'skipped' };
      return;
    }
    const log = createLogger('core');
    void checkAiProvider(selection).then((result) => {
      status.check = result;
      if (result.status === 'ok') {
        log.info('AI provider check passed', { provider: status.provider, latencyMs: result.latencyMs });
      } else if (result.status === 'failed') {
        log.error('AI provider check failed', { provider: status.provider, reason: result.message });
      }
    });
  }

  async stop(container: Container): Promise<void> {
    const pool = container.resolve(PG_POOL);
    await pool?.end();
    await Promise.all(this.redisClients.map((client) => client.quit()));
  }
}
