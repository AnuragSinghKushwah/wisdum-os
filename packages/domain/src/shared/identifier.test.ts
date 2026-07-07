import { describe, expect, it } from 'vitest';
import type { UUID } from '@wisdum/types';
import { Identifier } from './identifier.js';

class TestId extends Identifier<'TestId'> {
  static create(value: string): TestId {
    return new TestId(value as UUID);
  }
}

const ID_A = '11111111-1111-1111-1111-111111111111';
const ID_B = '22222222-2222-2222-2222-222222222222';

describe('Identifier', () => {
  it('is equal to another identifier with the same value', () => {
    expect(TestId.create(ID_A).equals(TestId.create(ID_A))).toBe(true);
  });

  it('is not equal to an identifier with a different value', () => {
    expect(TestId.create(ID_A).equals(TestId.create(ID_B))).toBe(false);
  });

  it('is not equal to a non-Identifier value', () => {
    expect(TestId.create(ID_A).equals(ID_A)).toBe(false);
  });

  it('exposes its raw value via value() and toString()', () => {
    const id = TestId.create(ID_A);
    expect(id.value()).toBe(ID_A);
    expect(id.toString()).toBe(ID_A);
  });
});
