import { describe, expect, it } from 'vitest';
import type { UUID } from '@wisdum/types';
import { Entity } from './entity.js';
import { Identifier } from './identifier.js';

class TestId extends Identifier<'TestId'> {
  static create(value: string): TestId {
    return new TestId(value as UUID);
  }
}

class TestEntity extends Entity<TestId> {
  constructor(id: TestId) {
    super(id);
  }
}

const ID_A = '11111111-1111-1111-1111-111111111111';
const ID_B = '22222222-2222-2222-2222-222222222222';

describe('Entity', () => {
  it('two entities with the same identity are equal, even with different state', () => {
    const a = new TestEntity(TestId.create(ID_A));
    const b = new TestEntity(TestId.create(ID_A));
    expect(a.equals(b)).toBe(true);
    expect(a.sameIdentityAs(b)).toBe(true);
  });

  it('two entities with different identities are not equal', () => {
    const a = new TestEntity(TestId.create(ID_A));
    const b = new TestEntity(TestId.create(ID_B));
    expect(a.equals(b)).toBe(false);
  });

  it('is not equal to a non-Entity value', () => {
    const a = new TestEntity(TestId.create(ID_A));
    expect(a.equals({ getId: () => TestId.create(ID_A) })).toBe(false);
  });

  it('getId() returns the identity it was constructed with', () => {
    const id = TestId.create(ID_A);
    const entity = new TestEntity(id);
    expect(entity.getId().equals(id)).toBe(true);
  });
});
