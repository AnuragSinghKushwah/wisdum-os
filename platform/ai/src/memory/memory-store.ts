export interface MemoryEntry {
  readonly key: string;
  readonly value: string;
  readonly createdAt: string;
}

/**
 * Durable memory scoped to a conversation, distinct from the raw
 * transcript (see `Conversation.messages` in `@wisdum/domain`). Holds
 * derived facts, summaries, or retrieved context a runtime wants to
 * persist across turns without replaying the whole history.
 */
export interface MemoryStore {
  remember(conversationId: string, entry: { key: string; value: string }): Promise<void>;
  recall(conversationId: string, key: string): Promise<MemoryEntry | undefined>;
  list(conversationId: string): Promise<readonly MemoryEntry[]>;
  forget(conversationId: string, key: string): Promise<void>;
}
