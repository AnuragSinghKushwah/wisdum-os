import type { Identifier } from './identifier.js';

/**
 * An entity has a persistent identity that distinguishes it from other
 * entities even when their attributes are identical. Identity is immutable
 * for the lifetime of the entity.
 *
 * Entities are mutable; their attributes change, but their identity persists.
 */
export abstract class Entity<TId extends Identifier<string>> {
  protected readonly id: TId;

  protected constructor(id: TId) {
    this.id = Object.freeze(id);
  }

  getId(): TId {
    return this.id;
  }

  equals(other: unknown): boolean {
    if (!(other instanceof Entity)) return false;
    return this.id.equals((other as Entity<TId>).id);
  }

  sameIdentityAs(other: Entity<TId>): boolean {
    return this.equals(other);
  }
}
