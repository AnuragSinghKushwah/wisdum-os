import type { StorageProvider } from './storage-provider.js';

/** In-memory object store for development and tests. */
export class InMemoryStorageProvider implements StorageProvider {
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
