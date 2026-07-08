import { describe, expect, it, vi } from 'vitest';
import type { Event } from '@wisdum/events';
import { RedisEventBus } from './redis-event-bus.js';
import type { RedisPubSubClient } from './redis-event-bus.js';

function testEvent(name: Event['name'], payload: unknown): Event {
  return {
    id: 'evt-1' as never,
    name,
    version: 1,
    tenantId: 'tenant-1' as never,
    occurredAt: '2024-01-01T00:00:00.000Z' as never,
    payload,
  };
}

/**
 * A minimal in-process broker standing in for a Redis server: `publish`
 * on one fake client delivers straight to the `message` listeners
 * registered on every fake client subscribed to that channel, exactly as
 * ioredis would relay it through an actual Redis instance.
 */
class FakeRedisBroker {
  private readonly subscriptions = new Map<string, Set<(channel: string, message: string) => void>>();

  createClient(): RedisPubSubClient {
    const listeners = new Set<(channel: string, message: string) => void>();
    const subscribedChannels = new Set<string>();

    return {
      publish: (channel, message) => {
        for (const channelListeners of this.subscriptions.get(channel) ?? []) {
          channelListeners(channel, message);
        }
        return Promise.resolve(1);
      },
      subscribe: (channel) => {
        subscribedChannels.add(channel);
        const set = this.subscriptions.get(channel) ?? new Set();
        for (const listener of listeners) set.add(listener);
        this.subscriptions.set(channel, set);
        return Promise.resolve();
      },
      unsubscribe: (channel) => {
        subscribedChannels.delete(channel);
        this.subscriptions.get(channel)?.clear();
        return Promise.resolve();
      },
      on: (_event, listener) => {
        listeners.add(listener);
        for (const channel of subscribedChannels) {
          const set = this.subscriptions.get(channel) ?? new Set();
          set.add(listener);
          this.subscriptions.set(channel, set);
        }
      },
    };
  }
}

describe('RedisEventBus', () => {
  it('delivers a published event to a subscriber connected through a different client', async () => {
    const broker = new FakeRedisBroker();
    const bus = new RedisEventBus(broker.createClient(), broker.createClient());
    const seen: unknown[] = [];

    bus.subscribe('test.thing.happened', async (event) => {
      seen.push(event.payload);
    });
    await bus.publish(testEvent('test.thing.happened', { n: 1 }));
    await vi.waitFor(() => expect(seen).toEqual([{ n: 1 }]));
  });

  it('does not deliver to subscribers of a different event name', async () => {
    const broker = new FakeRedisBroker();
    const bus = new RedisEventBus(broker.createClient(), broker.createClient());
    const seen: unknown[] = [];

    bus.subscribe('other.thing.happened', async (event) => {
      seen.push(event.payload);
    });
    await bus.publish(testEvent('test.thing.happened', { n: 1 }));

    expect(seen).toHaveLength(0);
  });

  it('unsubscribe() stops further delivery to that handler', async () => {
    const broker = new FakeRedisBroker();
    const bus = new RedisEventBus(broker.createClient(), broker.createClient());
    let count = 0;

    const unsubscribe = bus.subscribe('test.thing.happened', async () => {
      count += 1;
    });
    await bus.publish(testEvent('test.thing.happened', {}));
    await vi.waitFor(() => expect(count).toBe(1));

    unsubscribe();
    await bus.publish(testEvent('test.thing.happened', {}));

    expect(count).toBe(1);
  });

  it('a failing handler does not throw out of publish() and does not block other handlers', async () => {
    const broker = new FakeRedisBroker();
    const bus = new RedisEventBus(broker.createClient(), broker.createClient());
    let goodHandlerRan = false;

    bus.subscribe('test.thing.happened', async () => {
      goodHandlerRan = true;
    });
    bus.subscribe('test.thing.happened', async () => {
      throw new Error('boom');
    });

    await expect(bus.publish(testEvent('test.thing.happened', {}))).resolves.toBeUndefined();
    await vi.waitFor(() => expect(goodHandlerRan).toBe(true));
  });
});
