import { describe, expect, it } from 'vitest';
import { ValueObject } from './value-object.js';

class Money extends ValueObject<Money> {
  constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {
    super();
  }

  equals(other: unknown): boolean {
    return (
      other instanceof Money && other.amount === this.amount && other.currency === this.currency
    );
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }

  deepEqualsPublic(a: unknown, b: unknown): boolean {
    return this.deepEquals(a, b);
  }
}

describe('ValueObject', () => {
  it('two instances with equal attributes are equal', () => {
    expect(new Money(100, 'USD').equals(new Money(100, 'USD'))).toBe(true);
  });

  it('instances with different attributes are not equal', () => {
    expect(new Money(100, 'USD').equals(new Money(100, 'EUR'))).toBe(false);
    expect(new Money(100, 'USD').equals(new Money(200, 'USD'))).toBe(false);
  });

  describe('deepEquals', () => {
    const money = new Money(1, 'USD');

    it('treats identical primitives as equal', () => {
      expect(money.deepEqualsPublic(1, 1)).toBe(true);
      expect(money.deepEqualsPublic('a', 'a')).toBe(true);
    });

    it('treats null and undefined as distinct from each other and from 0', () => {
      expect(money.deepEqualsPublic(null, undefined)).toBe(false);
      expect(money.deepEqualsPublic(null, 0)).toBe(false);
    });

    it('recursively compares nested objects', () => {
      expect(money.deepEqualsPublic({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(money.deepEqualsPublic({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it('treats objects with a different number of keys as unequal', () => {
      expect(money.deepEqualsPublic({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
  });
});
