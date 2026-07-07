import type { CacheProvider } from './cache-provider.js';

interface Entry {
  readonly value: unknown;
  readonly expiresAt?: number;
}

/** In-memory cache for development and tests. TTLs are checked lazily on read. */
export class InMemoryCacheProvider implements CacheProvider {
  private readonly entries = new Map<string, Entry>();

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);
    if (entry === undefined) return Promise.resolve(undefined);
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined;
    this.entries.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }
}
