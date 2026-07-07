import type { UUID } from '@wisdum/types';

/**
 * Strongly typed, immutable identifier abstraction. Prevents accidental
 * mixing of identifiers from different domains or aggregates.
 *
 * The generic TBrand parameter (e.g., 'UserId') is phantom — it affects
 * types but not runtime — so callers cannot accidentally pass a UserId
 * where a DocumentId is expected.
 */
export abstract class Identifier<TBrand extends string> {
  protected readonly id: UUID;

  protected constructor(id: UUID) {
    this.id = id;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Identifier)) return false;
    return this.id === (other as Identifier<TBrand>).id;
  }

  toString(): string {
    return this.id;
  }

  value(): UUID {
    return this.id;
  }
}
