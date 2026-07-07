import { ConfigurationError } from '@wisdum/errors';
import type { Token } from './token.js';

/**
 * How long a resolved instance lives:
 * - `singleton` — one instance per container tree (created in the root).
 * - `scoped` — one instance per scope (e.g. per request).
 * - `transient` — a new instance on every resolution.
 */
export type ServiceLifetime = 'singleton' | 'scoped' | 'transient';

/** Builds a service instance, resolving its dependencies from the container. */
export type ServiceFactory<T> = (container: Container) => T;

/**
 * The dependency injection port every module registers against. The kernel
 * ships a reflection-free implementation; nothing in the platform may
 * depend on decorators or metadata emit.
 */
export interface Container {
  register<T>(token: Token<T>, factory: ServiceFactory<T>, lifetime?: ServiceLifetime): void;
  /** Register an already-constructed instance as a singleton. */
  registerValue<T>(token: Token<T>, value: T): void;
  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  /** Child scope: shares singletons with the root, isolates scoped instances. */
  createScope(): Container;
}

interface Registration<T = unknown> {
  readonly factory: ServiceFactory<T>;
  readonly lifetime: ServiceLifetime;
}

/**
 * The kernel's container implementation. Detects circular resolution chains
 * and fails fast with the full chain in the error details.
 */
export class KernelContainer implements Container {
  private readonly registrations: Map<symbol, Registration>;
  private readonly singletons: Map<symbol, unknown>;
  private readonly scopedInstances = new Map<symbol, unknown>();
  private readonly resolving: symbol[] = [];
  private readonly root?: KernelContainer;

  constructor(parent?: KernelContainer) {
    this.root = parent?.root ?? parent;
    this.registrations = parent ? parent.registrations : new Map();
    this.singletons = parent ? parent.singletons : new Map();
  }

  register<T>(
    token: Token<T>,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime = 'singleton',
  ): void {
    if (this.registrations.has(token.key)) {
      throw new ConfigurationError(`Service '${token.description}' is already registered`, {
        token: token.description,
      });
    }
    this.registrations.set(token.key, { factory: factory as ServiceFactory<unknown>, lifetime });
  }

  registerValue<T>(token: Token<T>, value: T): void {
    this.register(token, () => value, 'singleton');
    this.singletons.set(token.key, value);
  }

  resolve<T>(token: Token<T>): T {
    const registration = this.registrations.get(token.key);
    if (registration === undefined) {
      throw new ConfigurationError(`Service '${token.description}' is not registered`, {
        token: token.description,
      });
    }
    if (this.resolving.includes(token.key)) {
      throw new ConfigurationError('Circular dependency detected', {
        chain: [...this.resolving, token.key].map((key) => key.description ?? 'unknown'),
      });
    }
    switch (registration.lifetime) {
      case 'singleton':
        return this.memoized(this.singletons, token, registration) as T;
      case 'scoped':
        return this.memoized(this.scopedInstances, token, registration) as T;
      case 'transient':
        return this.build(token, registration) as T;
    }
  }

  has<T>(token: Token<T>): boolean {
    return this.registrations.has(token.key);
  }

  createScope(): Container {
    return new KernelContainer(this);
  }

  private memoized(
    cache: Map<symbol, unknown>,
    token: Token<unknown>,
    registration: Registration,
  ): unknown {
    if (cache.has(token.key)) return cache.get(token.key);
    const instance = this.build(token, registration);
    cache.set(token.key, instance);
    return instance;
  }

  private build(token: Token<unknown>, registration: Registration): unknown {
    this.resolving.push(token.key);
    try {
      return registration.factory(this);
    } finally {
      this.resolving.pop();
    }
  }
}
