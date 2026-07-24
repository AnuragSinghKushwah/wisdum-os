import { Registry } from '../registry/registry.js';

/**
 * Resolves a capability string (e.g. `publishing.website`) to a
 * statically-imported, concrete adapter instance. Distinct from
 * `@wisdum/platform-plugins`'s `CapabilityResolver`: that one filters
 * dynamically-loaded, untyped `PluginHandle` records by runtime state; this
 * one is a compile-time-typed lookup over first-party adapters wired in the
 * composition root — no dynamic `import()`, no sandboxing. Tenant-level
 * enable/disable is enforced separately, against the domain `Plugin`
 * aggregate, before a resolved provider is invoked.
 */
export class CapabilityRegistry<T> {
  private readonly registry: Registry<T>;

  constructor(kind: string) {
    this.registry = new Registry<T>(kind);
  }

  register(capability: string, provider: T): void {
    this.registry.register(capability, provider);
  }

  resolve(capability: string): T | undefined {
    return this.registry.get(capability);
  }

  require(capability: string): T {
    return this.registry.require(capability);
  }
}
