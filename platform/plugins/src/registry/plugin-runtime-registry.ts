import { Registry } from '@wisdum/kernel';
import type { PluginEntryPoint, PluginHandle, PluginRuntimeState } from '@wisdum/kernel';

interface PluginRuntimeEntry {
  readonly entryPoint: PluginEntryPoint;
  readonly version: string;
  readonly capabilities: readonly string[];
  state: PluginRuntimeState;
}

export interface RegisterPluginRuntimeProps {
  readonly entryPoint: PluginEntryPoint;
  readonly version: string;
  readonly capabilities: readonly string[];
}

/**
 * Tracks every loaded plugin's entry point, declared capabilities, and
 * current runtime state. The kernel-facing `PluginLifecycleManager` reads
 * this to answer `list()`; the capability resolver reads it to route
 * capability requests to active plugins.
 */
export class PluginRuntimeRegistry {
  private readonly registry = new Registry<PluginRuntimeEntry>('Plugin');

  register(props: RegisterPluginRuntimeProps): void {
    this.registry.register(props.entryPoint.name, {
      entryPoint: props.entryPoint,
      version: props.version,
      capabilities: props.capabilities,
      state: 'loaded',
    });
  }

  setState(name: string, state: PluginRuntimeState): void {
    this.registry.require(name).state = state;
  }

  get(name: string): PluginRuntimeEntry | undefined {
    return this.registry.get(name);
  }

  require(name: string): PluginRuntimeEntry {
    return this.registry.require(name);
  }

  handles(): readonly PluginHandle[] {
    return this.registry.values().map((entry) => ({
      name: entry.entryPoint.name,
      version: entry.version,
      state: entry.state,
      capabilities: entry.capabilities,
    }));
  }
}
