import type { EventHandler } from '@wisdum/events';
import type { EventName } from '@wisdum/contracts';

/**
 * Tracks which handlers are subscribed to which event names. Shared by
 * `InMemoryEventBus` and any future transport that needs the same
 * bookkeeping (a broker plugin still dispatches to local subscribers).
 */
export class SubscriberRegistry {
  private readonly handlers = new Map<EventName, Set<EventHandler>>();

  subscribe<TPayload>(name: EventName, handler: EventHandler<TPayload>): () => void {
    const set = this.handlers.get(name) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.handlers.set(name, set);
    return () => {
      set.delete(handler as EventHandler);
      if (set.size === 0) this.handlers.delete(name);
    };
  }

  handlersFor(name: EventName): readonly EventHandler[] {
    return [...(this.handlers.get(name) ?? [])];
  }

  subscriberCount(name: EventName): number {
    return this.handlers.get(name)?.size ?? 0;
  }
}
