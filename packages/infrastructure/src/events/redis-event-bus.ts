import type { Event, EventBus, EventHandler } from '@wisdum/events';
import type { EventName } from '@wisdum/contracts';
import { createLogger } from '@wisdum/logger';
import { EventDispatcher } from './event-dispatcher.js';
import { SubscriberRegistry } from './subscriber-registry.js';

const CHANNEL_PREFIX = 'wisdum:events:';
const logger = createLogger('redis-event-bus');

function channelFor(name: EventName): string {
  return `${CHANNEL_PREFIX}${name}`;
}

/**
 * The subset of an `ioredis`-shaped client this adapter depends on. Keeping
 * the dependency this narrow lets the bus be unit-tested against an
 * in-process fake instead of a running Redis server.
 */
export interface RedisPubSubClient {
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
}

/**
 * Redis Pub/Sub-backed EventBus for multi-instance deployments: `publish`
 * broadcasts to every process subscribed to the event's channel, not just
 * local subscribers. Pub/Sub is fire-and-forget — a subscriber that is
 * offline when an event is published never receives it; durable,
 * at-least-once delivery is the transactional outbox's job, not this
 * bus's. Requires two client connections (ioredis puts a client that has
 * called `subscribe` into a mode where it can no longer issue other
 * commands).
 */
export class RedisEventBus implements EventBus {
  private readonly local = new SubscriberRegistry();
  private readonly dispatcher = new EventDispatcher();

  constructor(
    private readonly publisher: RedisPubSubClient,
    private readonly subscriber: RedisPubSubClient,
  ) {
    this.subscriber.on('message', (channel, message) => {
      void this.handleMessage(channel, message);
    });
  }

  async publish(event: Event): Promise<void> {
    await this.publisher.publish(channelFor(event.name), JSON.stringify(event));
  }

  subscribe<TPayload>(name: EventName, handler: EventHandler<TPayload>): () => void {
    const alreadySubscribed = this.local.subscriberCount(name) > 0;
    const unsubscribeLocal = this.local.subscribe(name, handler);
    if (!alreadySubscribed) {
      void this.subscriber.subscribe(channelFor(name));
    }
    return () => {
      unsubscribeLocal();
      if (this.local.subscriberCount(name) === 0) {
        void this.subscriber.unsubscribe(channelFor(name));
      }
    };
  }

  private async handleMessage(channel: string, message: string): Promise<void> {
    if (!channel.startsWith(CHANNEL_PREFIX)) return;
    const name = channel.slice(CHANNEL_PREFIX.length) as EventName;

    let event: Event;
    try {
      event = JSON.parse(message) as Event;
    } catch {
      logger.error('Failed to parse event message', { channel });
      return;
    }

    const handlers = this.local.handlersFor(name);
    const results = await this.dispatcher.dispatch(event, handlers);
    for (const result of results) {
      if (result.error !== undefined) {
        logger.error(`Handler failed for event '${name}'`, { error: String(result.error) });
      }
    }
  }
}
