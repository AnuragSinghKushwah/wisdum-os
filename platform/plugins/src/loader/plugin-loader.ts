import type { Container, PluginEntryPoint } from '@wisdum/kernel';
import type { Sandbox } from '../sandbox/sandbox.js';

/**
 * Runs a plugin's lifecycle callbacks through its sandbox. The loader
 * itself holds no state about which plugins exist — that bookkeeping is
 * `PluginRuntimeRegistry`'s job.
 */
export class PluginLoader {
  constructor(
    private readonly container: Container,
    private readonly sandbox: Sandbox,
  ) {}

  load(entryPoint: PluginEntryPoint): Promise<void> {
    return this.sandbox.run(() => entryPoint.register(this.container));
  }

  async activate(entryPoint: PluginEntryPoint): Promise<void> {
    if (entryPoint.activate === undefined) return;
    await this.sandbox.run(() => entryPoint.activate?.(this.container));
  }

  async deactivate(entryPoint: PluginEntryPoint): Promise<void> {
    if (entryPoint.deactivate === undefined) return;
    await this.sandbox.run(() => entryPoint.deactivate?.(this.container));
  }
}
