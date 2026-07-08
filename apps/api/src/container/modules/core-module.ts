import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createPgPool, migrateUp } from '@wisdum/database';
import { optionalEnv, requireEnv } from '@wisdum/config';
import { SystemClock } from '@wisdum/domain';
import {
  InMemoryEventBus,
  JwtTokenService,
  KebabSlugGenerator,
  RedisEventBus,
  UuidGenerator,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import type { EventBus } from '@wisdum/events';
import { AnthropicLlmProvider, OpenAiLlmProvider } from '@wisdum/platform-ai';
import type { LlmProvider } from '@wisdum/platform-ai';
import { Redis } from 'ioredis';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  LLM_MODEL,
  LLM_PROVIDER,
  PG_POOL,
  SLUG_GENERATOR,
  TOKEN_SERVICE,
} from '../tokens.js';

const DEFAULT_ANTHROPIC_MODEL = 'anthropic/claude-sonnet-5';
const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o-mini';

/**
 * Picks a real `LlmProvider` (and a matching default model name) from
 * whichever provider API key is present (Anthropic takes precedence when
 * both are set). Shared by AiModule (chat) and ReasoningModule (one-shot
 * completions) — neither vendor SDK is referenced outside this composition
 * root. The model name is overridable via `REASONING_LLM_MODEL` since
 * exact available model ids drift over time.
 */
function createLlmProvider(): { provider: LlmProvider; model: string } | undefined {
  const anthropicKey = optionalEnv('ANTHROPIC_API_KEY', '');
  if (anthropicKey.length > 0) {
    return {
      provider: new AnthropicLlmProvider(new Anthropic({ apiKey: anthropicKey })),
      model: optionalEnv('REASONING_LLM_MODEL', DEFAULT_ANTHROPIC_MODEL),
    };
  }
  const openAiKey = optionalEnv('OPENAI_API_KEY', '');
  if (openAiKey.length > 0) {
    return {
      provider: new OpenAiLlmProvider(new OpenAI({ apiKey: openAiKey })),
      model: optionalEnv('REASONING_LLM_MODEL', DEFAULT_OPENAI_MODEL),
    };
  }
  return undefined;
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

  register(container: Container): void {
    container.registerValue(CLOCK, SystemClock.instance());
    container.registerValue(ID_GENERATOR, new UuidGenerator());
    container.registerValue(SLUG_GENERATOR, new KebabSlugGenerator());

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

    container.registerValue(TOKEN_SERVICE, new JwtTokenService(requireEnv('JWT_SECRET')));

    const llm = createLlmProvider();
    container.registerValue(LLM_PROVIDER, llm?.provider);
    container.registerValue(LLM_MODEL, llm?.model);
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
