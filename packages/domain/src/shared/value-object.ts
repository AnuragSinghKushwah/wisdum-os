/**
 * A value object has no identity; two value objects are equal if their
 * attributes are equal. Value objects are immutable.
 */
export abstract class ValueObject<T extends ValueObject<T>> {
  abstract equals(other: unknown): boolean;

  abstract toString(): string;

  protected deepEquals(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;

    if (a === null || b === null || a === undefined || b === undefined) {
      return Object.is(a, b);
    }

    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const aKeys = Object.keys(a as Record<string, unknown>);
      const bKeys = Object.keys(b as Record<string, unknown>);

      if (aKeys.length !== bKeys.length) return false;

      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      for (const key of aKeys) {
        if (!this.deepEquals(aObj[key], bObj[key])) return false;
      }

      return true;
    }

    return Object.is(a, b);
  }
}
