import type { Container } from '../di/container.js';

/**
 * Kernel-side plugin lifecycle contracts. The kernel defines how plugins
 * hook into the process; discovery, loading, sandboxing, and dependency
 * resolution are implemented by the plugin runtime (`@wisdum/platform-plugins`).
 */

/** Runtime state of a loaded plugin inside this process. */
export const PLUGIN_RUNTIME_STATES = ['loaded', 'active', 'stopped', 'errored'] as const;
export type PluginRuntimeState = (typeof PLUGIN_RUNTIME_STATES)[number];

/**
 * What a plugin's entry module exports. Mirrors KernelModule deliberately —
 * a plugin is an externally delivered module with a constrained container
 * view.
 */
export interface PluginEntryPoint {
  /** Must match the manifest's plugin name. */
  readonly name: string;
  /** Register the plugin's services and capability implementations. */
  register(container: Container): void;
  activate?(container: Container): Promise<void>;
  deactivate?(container: Container): Promise<void>;
}

/** A plugin as the kernel tracks it at runtime. */
export interface PluginHandle {
  readonly name: string;
  readonly version: string;
  readonly state: PluginRuntimeState;
  readonly capabilities: readonly string[];
}

/**
 * The kernel's window into the plugin runtime: enough to start plugins at
 * boot, stop them at shutdown, and report their state — nothing more.
 */
export interface PluginLifecycleManager {
  activate(name: string): Promise<void>;
  deactivate(name: string): Promise<void>;
  list(): readonly PluginHandle[];
}
