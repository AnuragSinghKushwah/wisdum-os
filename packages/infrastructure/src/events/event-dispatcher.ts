import type { Event, EventHandler } from '@wisdum/events';

/** Outcome of dispatching one event to one handler. */
export interface DispatchResult {
  readonly handler: EventHandler;
  readonly error?: unknown;
}

/**
 * Runs an event through a set of handlers, isolating failures so one
 * broken subscriber never blocks or breaks delivery to the others.
 * Handlers must be idempotent (delivery is at-least-once); the dispatcher
 * does not retry — that is the caller's (or an outbox relay's) concern.
 */
export class EventDispatcher {
  async dispatch(
    event: Event,
    handlers: readonly EventHandler[],
  ): Promise<readonly DispatchResult[]> {
    const results = await Promise.all(
      handlers.map(async (handler): Promise<DispatchResult> => {
        try {
          await handler(event);
          return { handler };
        } catch (error) {
          return { handler, error };
        }
      }),
    );
    return results;
  }
}
