import { ConfigurationError } from '@wisdum/errors';
import { Registry } from '../registry/registry.js';
import type { KernelModule } from './module.js';

/**
 * Holds registered modules and resolves a start order that respects
 * `dependsOn` declarations (topological order; cycles fail fast).
 */
export class ModuleRegistry {
  private readonly registry = new Registry<KernelModule>('Module');

  add(module: KernelModule): void {
    this.registry.register(module.name, module);
  }

  get(name: string): KernelModule | undefined {
    return this.registry.get(name);
  }

  names(): readonly string[] {
    return this.registry.names();
  }

  /** Modules in dependency order: every module appears after its dependencies. */
  inStartOrder(): readonly KernelModule[] {
    const ordered: KernelModule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (module: KernelModule, chain: readonly string[]): void => {
      if (visited.has(module.name)) return;
      if (visiting.has(module.name)) {
        throw new ConfigurationError('Circular module dependency detected', {
          chain: [...chain, module.name],
        });
      }
      visiting.add(module.name);
      for (const dependency of module.dependsOn ?? []) {
        const resolved = this.registry.get(dependency);
        if (resolved === undefined) {
          throw new ConfigurationError(
            `Module '${module.name}' depends on unregistered module '${dependency}'`,
            { module: module.name, dependency },
          );
        }
        visit(resolved, [...chain, module.name]);
      }
      visiting.delete(module.name);
      visited.add(module.name);
      ordered.push(module);
    };

    for (const module of this.registry.values()) {
      visit(module, []);
    }
    return ordered;
  }
}
