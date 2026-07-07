import type { UUID } from '@wisdum/types';

/**
 * Strongly typed, immutable identifier abstraction. Prevents accidental
 * mixing of identifiers from different domains or aggregates.
 *
 * The TBrand parameter (e.g. 'KnowledgeId') is phantom — the `__brand` field
 * is declared but never emitted or assigned — so identifiers with different
 * brands are not assignable to each other even though they share structure.
 */
export abstract class Identifier<TBrand extends string> {
  declare protected readonly __brand: TBrand;

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
