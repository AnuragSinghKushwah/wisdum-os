/**
 * Kernel lifecycle vocabulary. The kernel moves strictly forward through
 * these phases; `failed` can be entered from any phase.
 */
export const KERNEL_PHASES = [
  'created',
  'registering',
  'starting',
  'running',
  'stopping',
  'stopped',
  'failed',
] as const;
export type KernelPhase = (typeof KERNEL_PHASES)[number];

/** Work to run during graceful shutdown, registered at any point while running. */
export type ShutdownHook = () => Promise<void>;

/** Read-only view of the kernel's lifecycle state. */
export interface LifecycleObserver {
  readonly phase: KernelPhase;
  isRunning(): boolean;
}
