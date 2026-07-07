import { describe, expect, it } from 'vitest';
import type { Event } from '@wisdum/events';
import { InMemoryEventBus } from './in-memory-event-bus.js';

function testEvent(payload: unknown): Event {
  return {
    id: 'evt-1' as never,
    name: 'test.thing.happened',
    version: 1,
    tenantId: 'tenant-1' as never,
    occurredAt: '2024-01-01T00:00:00.000Z' as never,
    payload,
  };
}

describe('InMemoryEventBus', () => {
  it('delivers a published event to every subscriber of that name', async () => {
    const bus = new InMemoryEventBus();
    const seenByA: unknown[] = [];
    const seenByB: unknown[] = [];
    bus.subscribe('test.thing.happened', async (event) => {
      seenByA.push(event.payload);
    });
    bus.subscribe('test.thing.happened', async (event) => {
      seenByB.push(event.payload);
    });

    await bus.publish(testEvent({ n: 1 }));

    expect(seenByA).toEqual([{ n: 1 }]);
    expect(seenByB).toEqual([{ n: 1 }]);
  });

  it('does not deliver to subscribers of a different event name', async () => {
    const bus = new InMemoryEventBus();
    const seen: unknown[] = [];
    bus.subscribe('other.thing.happened', async (event) => {
      seen.push(event.payload);
    });

    await bus.publish(testEvent({ n: 1 }));

    expect(seen).toHaveLength(0);
  });

  it('unsubscribe() stops further delivery to that handler', async () => {
    const bus = new InMemoryEventBus();
    let count = 0;
    const unsubscribe = bus.subscribe('test.thing.happened', async () => {
      count += 1;
    });

    await bus.publish(testEvent({}));
    unsubscribe();
    await bus.publish(testEvent({}));

    expect(count).toBe(1);
  });

  it('one failing handler does not prevent delivery to the others', async () => {
    const bus = new InMemoryEventBus();
    let goodHandlerRan = false;
    bus.subscribe('test.thing.happened', async () => {
      goodHandlerRan = true;
    });
    bus.subscribe('test.thing.happened', async () => {
      throw new Error('boom');
    });

    await expect(bus.publish(testEvent({}))).rejects.toThrow();
    expect(goodHandlerRan).toBe(true);
  });

  it('publish() aggregates every handler failure into one thrown error', async () => {
    const bus = new InMemoryEventBus();
    bus.subscribe('test.thing.happened', async () => {
      throw new Error('first');
    });
    bus.subscribe('test.thing.happened', async () => {
      throw new Error('second');
    });

    await expect(bus.publish(testEvent({}))).rejects.toThrow(/2 of 2 handler/);
  });
});
