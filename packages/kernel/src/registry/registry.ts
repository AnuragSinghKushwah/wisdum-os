import { ConfigurationError } from '@wisdum/errors';

/**
 * A generic, name-keyed registry. The kernel uses it for modules, health
 * checks, event subscribers, and plugin records; runtimes reuse it for
 * their own catalogs. Registration is write-once per name — replacing an
 * entry must be an explicit unregister + register.
 */
export class Registry<T> {
  private readonly entries = new Map<string, T>();

  constructor(private readonly kind: string) {}

  register(name: string, entry: T): void {
    if (this.entries.has(name)) {
      throw new ConfigurationError(`${this.kind} '${name}' is already registered`, {
        kind: this.kind,
        name,
      });
    }
    this.entries.set(name, entry);
  }

  unregister(name: string): boolean {
    return this.entries.delete(name);
  }

  get(name: string): T | undefined {
    return this.entries.get(name);
  }

  require(name: string): T {
    const entry = this.entries.get(name);
    if (entry === undefined) {
      throw new ConfigurationError(`${this.kind} '${name}' is not registered`, {
        kind: this.kind,
        name,
      });
    }
    return entry;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  names(): readonly string[] {
    return [...this.entries.keys()];
  }

  values(): readonly T[] {
    return [...this.entries.values()];
  }

  get size(): number {
    return this.entries.size;
  }
}
