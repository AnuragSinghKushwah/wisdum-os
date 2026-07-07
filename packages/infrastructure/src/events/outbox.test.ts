import { describe, expect, it } from 'vitest';
import type { Event } from '@wisdum/events';
import { InMemoryOutbox } from './outbox.js';

function testEvent(id: string): Event {
  return {
    id: id as never,
    name: 'test.thing.happened',
    version: 1,
    tenantId: 'tenant-1' as never,
    occurredAt: '2024-01-01T00:00:00.000Z' as never,
    payload: {},
  };
}

describe('InMemoryOutbox', () => {
  it('enqueue() then pending() returns events in enqueue order', async () => {
    const outbox = new InMemoryOutbox();
    await outbox.enqueue(testEvent('evt-1'));
    await outbox.enqueue(testEvent('evt-2'));

    const pending = await outbox.pending(10);
    expect(pending.map((event) => event.id)).toEqual(['evt-1', 'evt-2']);
  });

  it('pending(limit) caps the number of events returned', async () => {
    const outbox = new InMemoryOutbox();
    await outbox.enqueue(testEvent('evt-1'));
    await outbox.enqueue(testEvent('evt-2'));

    const pending = await outbox.pending(1);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe('evt-1');
  });

  it('markPublished() removes the event from the pending queue', async () => {
    const outbox = new InMemoryOutbox();
    await outbox.enqueue(testEvent('evt-1'));
    await outbox.enqueue(testEvent('evt-2'));

    await outbox.markPublished('evt-1' as never);

    const pending = await outbox.pending(10);
    expect(pending.map((event) => event.id)).toEqual(['evt-2']);
  });
});
