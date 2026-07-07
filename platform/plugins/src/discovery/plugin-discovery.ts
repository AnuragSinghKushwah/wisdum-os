import type { PluginEntryPoint } from '@wisdum/kernel';

/**
 * Finds plugin entry points to load. A real implementation scans the
 * top-level `plugins/` directory (or an installed package registry); this
 * phase only fixes the discovery contract.
 */
export interface PluginDiscovery {
  discover(): Promise<readonly PluginEntryPoint[]>;
}

/** Fixed entry point list for composition roots and tests. */
export class StaticPluginDiscovery implements PluginDiscovery {
  constructor(private readonly entryPoints: readonly PluginEntryPoint[]) {}

  discover(): Promise<readonly PluginEntryPoint[]> {
    return Promise.resolve(this.entryPoints);
  }
}
