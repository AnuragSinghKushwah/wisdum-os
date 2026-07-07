import { describe, expect, it } from 'vitest';
import type { UUID } from '@wisdum/types';
import { AggregateRoot } from './aggregate-root.js';
import type { PendingDomainEvent } from './domain-event.js';
import { Identifier } from './identifier.js';

class TestId extends Identifier<'TestId'> {
  static create(value: string): TestId {
    return new TestId(value as UUID);
  }
}

class TestAggregate extends AggregateRoot<TestId> {
  constructor(id: TestId) {
    super(id);
  }

  raiseTestEvent(payload: unknown): void {
    this.addDomainEvent({
      eventType: 'test.aggregate.something-happened',
      aggregateId: this.getId(),
      tenantId: 'tenant-1' as never,
      occurredAt: '2024-01-01T00:00:00.000Z' as never,
      version: 1,
      payload,
    } as PendingDomainEvent);
  }
}

const ID_A = '11111111-1111-1111-1111-111111111111';

describe('AggregateRoot', () => {
  it('starts with no pending domain events', () => {
    const aggregate = new TestAggregate(TestId.create(ID_A));
    expect(aggregate.pullDomainEvents()).toHaveLength(0);
  });

  it('accumulates raised events until pulled', () => {
    const aggregate = new TestAggregate(TestId.create(ID_A));
    aggregate.raiseTestEvent({ first: true });
    aggregate.raiseTestEvent({ second: true });

    const events = aggregate.pullDomainEvents();
    expect(events).toHaveLength(2);
    expect(events[0]?.payload).toEqual({ first: true });
    expect(events[1]?.payload).toEqual({ second: true });
  });

  it('pullDomainEvents() returns a frozen copy, not the live collection', () => {
    const aggregate = new TestAggregate(TestId.create(ID_A));
    aggregate.raiseTestEvent({ n: 1 });
    const first = aggregate.pullDomainEvents();
    aggregate.raiseTestEvent({ n: 2 });
    const second = aggregate.pullDomainEvents();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('clearDomainEvents() empties the pending collection', () => {
    const aggregate = new TestAggregate(TestId.create(ID_A));
    aggregate.raiseTestEvent({ n: 1 });
    aggregate.clearDomainEvents();
    expect(aggregate.pullDomainEvents()).toHaveLength(0);
  });
});
