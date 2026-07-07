import type { MemoryEntry, MemoryStore } from './memory-store.js';

/** In-memory MemoryStore for development and tests. */
export class InMemoryMemoryStore implements MemoryStore {
  private readonly conversations = new Map<string, Map<string, MemoryEntry>>();

  remember(conversationId: string, entry: { key: string; value: string }): Promise<void> {
    const store = this.conversations.get(conversationId) ?? new Map<string, MemoryEntry>();
    store.set(entry.key, {
      key: entry.key,
      value: entry.value,
      createdAt: new Date().toISOString(),
    });
    this.conversations.set(conversationId, store);
    return Promise.resolve();
  }

  recall(conversationId: string, key: string): Promise<MemoryEntry | undefined> {
    return Promise.resolve(this.conversations.get(conversationId)?.get(key));
  }

  list(conversationId: string): Promise<readonly MemoryEntry[]> {
    return Promise.resolve([...(this.conversations.get(conversationId)?.values() ?? [])]);
  }

  forget(conversationId: string, key: string): Promise<void> {
    this.conversations.get(conversationId)?.delete(key);
    return Promise.resolve();
  }
}
