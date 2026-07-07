/**
 * Generic key-value cache primitive backing Redis (or an in-memory
 * stand-in) behind a vendor-neutral interface. Task queues and richer
 * Redis usage are separate concerns layered on top.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
