import { ConfigurationError } from '@wisdum/errors';
import { KernelContainer } from '../di/container.js';
import type { Container } from '../di/container.js';
import { ModuleRegistry } from '../modules/module-registry.js';
import type { KernelModule } from '../modules/module.js';
import { HealthRegistry } from '../health/health.js';
import type { HealthReport } from '../health/health.js';
import type { KernelPhase, LifecycleObserver, ShutdownHook } from '../lifecycle/lifecycle.js';

/**
 * The kernel: owns the container, module registration, startup, shutdown,
 * and health. It contains no application logic — apps compose modules into
 * a kernel and run it.
 */
export interface Kernel extends LifecycleObserver {
  readonly container: Container;
  readonly health: HealthRegistry;
  /** Register a module. Only allowed before start. */
  use(module: KernelModule): Kernel;
  /** Register all modules' services and run their start hooks in dependency order. */
  start(): Promise<void>;
  /** Stop modules in reverse start order, then run shutdown hooks. */
  stop(): Promise<void>;
  onShutdown(hook: ShutdownHook): void;
  report(): Promise<HealthReport>;
}

class WisdumKernel implements Kernel {
  readonly container: Container = new KernelContainer();
  readonly health = new HealthRegistry();

  private readonly modules = new ModuleRegistry();
  private readonly shutdownHooks: ShutdownHook[] = [];
  private started: readonly KernelModule[] = [];
  private _phase: KernelPhase = 'created';

  get phase(): KernelPhase {
    return this._phase;
  }

  isRunning(): boolean {
    return this._phase === 'running';
  }

  use(module: KernelModule): Kernel {
    if (this._phase !== 'created') {
      throw new ConfigurationError('Modules must be registered before the kernel starts', {
        module: module.name,
        phase: this._phase,
      });
    }
    this.modules.add(module);
    return this;
  }

  async start(): Promise<void> {
    if (this._phase !== 'created') {
      throw new ConfigurationError('Kernel can only be started once', { phase: this._phase });
    }
    try {
      this._phase = 'registering';
      const ordered = this.modules.inStartOrder();
      for (const module of ordered) {
        module.register(this.container);
      }
      this._phase = 'starting';
      const started: KernelModule[] = [];
      for (const module of ordered) {
        await module.start?.(this.container);
        started.push(module);
      }
      this.started = started;
      this._phase = 'running';
    } catch (error) {
      this._phase = 'failed';
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._phase !== 'running') return;
    this._phase = 'stopping';
    const errors: unknown[] = [];
    for (const module of [...this.started].reverse()) {
      try {
        await module.stop?.(this.container);
      } catch (error) {
        errors.push(error);
      }
    }
    for (const hook of [...this.shutdownHooks].reverse()) {
      try {
        await hook();
      } catch (error) {
        errors.push(error);
      }
    }
    this._phase = 'stopped';
    if (errors.length > 0) {
      throw new ConfigurationError('Errors during kernel shutdown', { count: errors.length });
    }
  }

  onShutdown(hook: ShutdownHook): void {
    this.shutdownHooks.push(hook);
  }

  report(): Promise<HealthReport> {
    return this.health.report();
  }
}

/** Create a new, empty kernel. */
export function createKernel(): Kernel {
  return new WisdumKernel();
}
