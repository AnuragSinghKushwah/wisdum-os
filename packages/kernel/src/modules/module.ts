import type { Container } from '../di/container.js';

/**
 * A kernel module is the unit of composition: each bounded context,
 * runtime, and adapter packages its service registrations (and optional
 * startup/shutdown work) as a module. Modules contain wiring only — no
 * application logic.
 */
export interface KernelModule {
  /** Unique module name, lowercase kebab-case (e.g. `domain-knowledge`). */
  readonly name: string;
  /** Names of modules that must be registered and started before this one. */
  readonly dependsOn?: readonly string[];
  /** Register services into the container. Called once, before start. */
  register(container: Container): void;
  /** Optional startup work (open connections, subscribe handlers). */
  start?(container: Container): Promise<void>;
  /** Optional shutdown work. Called in reverse start order. */
  stop?(container: Container): Promise<void>;
}
