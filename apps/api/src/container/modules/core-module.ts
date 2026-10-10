import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createPgPool, migrateUp } from '@wisdum/database';
import { optionalEnv } from '@wisdum/config';
import { SystemClock } from '@wisdum/domain';
import { createLogger } from '@wisdum/logger';
import { resolveJwtSecret } from '../../config/jwt-secret.js';
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
import { GeminiLlmProvider, OllamaLlmProvider } from '@wisdum/platform-ai';
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

const DEFAULT_ANTHROPIC_MODEL = 'anthropic/claude-sonnet-5-5';
const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_GEMINI_MODEL = 'gemini/gemini-2.5-flash';
const DEFAULT_OLLAMA_MODEL = 'ollama/llama3';

/** A configured model provider, the model to ask it for, and its short name for status reporting. */
export interface LlmSelection {
  readonly provider: LlmProvider;
  readonly model: string;
  readonly name: string;
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
    return {
      name: 'anthropic',
      provider: new AnthropicLlmProvider(new Anthropic({ apiKey: anthropicKey })),
      model: model(DEFAULT_ANTHROPIC_MODEL),
    };
  }
  const openAiKey = optionalEnv('OPENAI_API_KEY', '');
  if (openAiKey.length > 0) {
    return {
      name: 'openai',
      provider: new OpenAiLlmProvider(new OpenAI({ apiKey: openAiKey })),
      model: model(DEFAULT_OPENAI_MODEL),
    };
  }
  const geminiKey = optionalEnv('GEMINI_API_KEY', optionalEnv('GOOGLE_API_KEY', ''));
  if (geminiKey.length > 0) {
    return {
      name: 'gemini',
      provider: new GeminiLlmProvider({ apiKey: geminiKey }),
      model: model(DEFAULT_GEMINI_MODEL),
    };
  }
  // Never probed: a local Ollama is used only when the operator points at it.
  const ollamaHost = optionalEnv('OLLAMA_HOST', '');
  if (ollamaHost.length > 0) {
    return {
      name: 'ollama',
      provider: new OllamaLlmProvider({ baseUrl: ollamaHost }),
      model: model(DEFAULT_OLLAMA_MODEL),
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
    container.registerValue(
      LLM_STATUS,
      llm === undefined ? { mode: 'mock' } : { mode: 'live', provider: llm.name, model: llm.model },
    );
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
  }

  async stop(container: Container): Promise<void> {
    const pool = container.resolve(PG_POOL);
    await pool?.end();
    await Promise.all(this.redisClients.map((client) => client.quit()));
  }
}
