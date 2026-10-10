import { PermissionName } from '../value-objects/permission-name.js';

/**
 * The permissions held by an actor: a role's grants, or an API key's scopes.
 * Wildcards are honoured, so a set holding `knowledge:*` allows
 * `knowledge:write`.
 */
export class PermissionSet {
  private constructor(private readonly names: readonly PermissionName[]) {}

  static of(values: Iterable<string>): PermissionSet {
    const distinct = new Map<string, PermissionName>();
    for (const value of values) {
      const name = PermissionName.create(value);
      distinct.set(name.value, name);
    }
    return new PermissionSet([...distinct.values()]);
  }

  static empty(): PermissionSet {
    return new PermissionSet([]);
  }

  /** Union of several sets. */
  static union(sets: Iterable<PermissionSet>): PermissionSet {
    const values: string[] = [];
    for (const set of sets) {
      values.push(...set.toArray());
    }
    return PermissionSet.of(values);
  }

  /** Whether the set grants `requested`. */
  allows(requested: string): boolean {
    const wanted = PermissionName.create(requested);
    return this.names.some((held) => held.covers(wanted));
  }

  /** Whether the set grants every permission of `other`; a wildcard in `other` needs a wildcard here. */
  includesAll(other: PermissionSet): boolean {
    return other.names.every((wanted) => this.names.some((held) => held.covers(wanted)));
  }

  isEmpty(): boolean {
    return this.names.length === 0;
  }

  toArray(): string[] {
    return this.names.map((name) => name.value);
  }
}
