import type { BlobStorage } from './blob-storage.js';

/**
 * In-memory `BlobStorage` for development and tests. Shape-identical to
 * `@wisdum/infrastructure`'s `StorageProvider` by design — either
 * satisfies the other's interface structurally, with no dependency
 * between the two packages.
 */
export class InMemoryBlobStorage implements BlobStorage {
  private readonly objects = new Map<string, Buffer>();

  put(key: string, data: Buffer): Promise<void> {
    this.objects.set(key, data);
    return Promise.resolve();
  }

  get(key: string): Promise<Buffer | undefined> {
    return Promise.resolve(this.objects.get(key));
  }

  delete(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  list(prefix: string): Promise<readonly string[]> {
    return Promise.resolve([...this.objects.keys()].filter((key) => key.startsWith(prefix)));
  }
}
