import type { PluginHandle } from '@wisdum/kernel';
import type { PluginRuntimeRegistry } from '../registry/plugin-runtime-registry.js';

/**
 * Routes a capability request (e.g. `ai.llm-provider`) to the active
 * plugins that declare it. Multiple plugins may provide the same
 * capability — callers decide precedence (first, all, or a policy of
 * their own); this resolver only filters to what is currently usable.
 */
export class CapabilityResolver {
  constructor(private readonly registry: PluginRuntimeRegistry) {}

  resolve(capability: string): readonly PluginHandle[] {
    return this.registry
      .handles()
      .filter((handle) => handle.state === 'active' && handle.capabilities.includes(capability));
  }

  resolveOne(capability: string): PluginHandle | undefined {
    return this.resolve(capability)[0];
  }
}
