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
import { Redis } from 'ioredis';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  PG_POOL,
  SLUG_GENERATOR,
  TOKEN_SERVICE,
} from '../tokens.js';

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
