import { describe, expect, it } from 'vitest';
import { ComposableSpecification } from './specification.js';

class IsEven extends ComposableSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate % 2 === 0;
  }
}

class IsPositive extends ComposableSpecification<number> {
  isSatisfiedBy(candidate: number): boolean {
    return candidate > 0;
  }
}

describe('ComposableSpecification', () => {
  const isEven = new IsEven();
  const isPositive = new IsPositive();

  it('a single specification is satisfied or not on its own terms', () => {
    expect(isEven.isSatisfiedBy(4)).toBe(true);
    expect(isEven.isSatisfiedBy(3)).toBe(false);
  });

  describe('and()', () => {
    const evenAndPositive = isEven.and(isPositive);

    it('is satisfied only when both specifications are satisfied', () => {
      expect(evenAndPositive.isSatisfiedBy(4)).toBe(true);
      expect(evenAndPositive.isSatisfiedBy(-4)).toBe(false);
      expect(evenAndPositive.isSatisfiedBy(3)).toBe(false);
    });
  });

  describe('or()', () => {
    const evenOrPositive = isEven.or(isPositive);

    it('is satisfied when either specification is satisfied', () => {
      expect(evenOrPositive.isSatisfiedBy(3)).toBe(true); // positive, odd
      expect(evenOrPositive.isSatisfiedBy(-4)).toBe(true); // even, negative
      expect(evenOrPositive.isSatisfiedBy(-3)).toBe(false); // neither
    });
  });

  describe('not()', () => {
    const isOdd = isEven.not();

    it('inverts the specification', () => {
      expect(isOdd.isSatisfiedBy(3)).toBe(true);
      expect(isOdd.isSatisfiedBy(4)).toBe(false);
    });
  });

  it('composes across three levels without losing precedence', () => {
    // (even AND positive) OR (NOT positive) — i.e. non-negative evens, or any non-positive number.
    const spec = isEven.and(isPositive).or(isPositive.not());
    expect(spec.isSatisfiedBy(4)).toBe(true); // even & positive
    expect(spec.isSatisfiedBy(-3)).toBe(true); // not positive
    expect(spec.isSatisfiedBy(3)).toBe(false); // positive & odd & not(not positive)
  });
});
