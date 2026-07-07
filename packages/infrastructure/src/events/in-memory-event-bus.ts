import type { Event, EventBus, EventHandler } from '@wisdum/events';
import type { EventName } from '@wisdum/contracts';
import { EventDispatcher } from './event-dispatcher.js';
import { SubscriberRegistry } from './subscriber-registry.js';

/**
 * In-process EventBus for development, tests, and single-instance
 * deployments. Publishing dispatches synchronously to every current
 * subscriber of the event's name; a multi-instance deployment replaces
 * this with a broker-backed bus behind the same interface.
 */
export class InMemoryEventBus implements EventBus {
  private readonly subscribers = new SubscriberRegistry();
  private readonly dispatcher = new EventDispatcher();

  async publish(event: Event): Promise<void> {
    const handlers = this.subscribers.handlersFor(event.name);
    const results = await this.dispatcher.dispatch(event, handlers);
    const failures = results.filter((result) => result.error !== undefined);
    if (failures.length > 0) {
      throw new AggregateError(
        failures.map((failure) => failure.error),
        `${failures.length} of ${handlers.length} handler(s) failed for event '${event.name}'`,
      );
    }
  }

  subscribe<TPayload>(name: EventName, handler: EventHandler<TPayload>): () => void {
    return this.subscribers.subscribe(name, handler);
  }
}
