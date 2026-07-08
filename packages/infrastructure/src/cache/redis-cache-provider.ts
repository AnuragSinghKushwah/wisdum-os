import type { CacheProvider } from './cache-provider.js';

/**
 * The subset of an `ioredis`-shaped client this adapter depends on. Keeping
 * the dependency this narrow lets the provider be unit-tested against an
 * in-process fake instead of a running Redis server.
 */
export interface RedisKeyValueClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

/** Redis-backed cache: values are JSON-serialized; TTL uses Redis's own expiry. */
export class RedisCacheProvider implements CacheProvider {
  constructor(private readonly client: RedisKeyValueClient) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds !== undefined) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
