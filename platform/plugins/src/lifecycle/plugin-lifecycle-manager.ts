import { ConfigurationError } from '@wisdum/errors';
import type {
  Container,
  PluginEntryPoint,
  PluginHandle,
  PluginLifecycleManager,
} from '@wisdum/kernel';
import { PluginLoader } from '../loader/plugin-loader.js';
import { PluginRuntimeRegistry } from '../registry/plugin-runtime-registry.js';
import { PassthroughSandbox } from '../sandbox/sandbox.js';
import type { Sandbox } from '../sandbox/sandbox.js';

/** What callers provide when registering a plugin with the runtime. */
export interface RegisterRuntimePluginProps {
  readonly entryPoint: PluginEntryPoint;
  readonly version: string;
  readonly capabilities: readonly string[];
}

/**
 * The kernel-facing plugin runtime: loads a plugin's entry point, tracks
 * its state, and exposes `activate`/`deactivate`/`list` per the kernel's
 * `PluginLifecycleManager` contract. `register` is an addition beyond
 * that contract — callers add plugins here before the kernel drives them.
 *
 * Activation failures mark the plugin `errored` rather than leaving it in
 * an ambiguous state; a plugin that fails to activate never silently
 * reports as active.
 */
export class RuntimePluginLifecycleManager implements PluginLifecycleManager {
  private readonly loader: PluginLoader;
  private readonly registry = new PluginRuntimeRegistry();

  constructor(container: Container, sandbox: Sandbox = new PassthroughSandbox()) {
    this.loader = new PluginLoader(container, sandbox);
  }

  async register(props: RegisterRuntimePluginProps): Promise<void> {
    await this.loader.load(props.entryPoint);
    this.registry.register(props);
  }

  async activate(name: string): Promise<void> {
    const entry = this.requireEntry(name);
    try {
      await this.loader.activate(entry.entryPoint);
      this.registry.setState(name, 'active');
    } catch (error) {
      this.registry.setState(name, 'errored');
      throw error;
    }
  }

  async deactivate(name: string): Promise<void> {
    const entry = this.requireEntry(name);
    await this.loader.deactivate(entry.entryPoint);
    this.registry.setState(name, 'stopped');
  }

  list(): readonly PluginHandle[] {
    return this.registry.handles();
  }

  /** Exposed for the capability resolver and dependency-aware activation flows. */
  get runtimeRegistry(): PluginRuntimeRegistry {
    return this.registry;
  }

  private requireEntry(name: string): ReturnType<PluginRuntimeRegistry['require']> {
    const entry = this.registry.get(name);
    if (entry === undefined) {
      throw new ConfigurationError(`Plugin '${name}' is not registered`, { plugin: name });
    }
    return entry;
  }
}
