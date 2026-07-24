/** A unit of recurring work registered against a Scheduler. */
export interface ScheduledJob {
  readonly name: string;
  readonly intervalMs: number;
  readonly task: () => Promise<void>;
}

/**
 * Runs named, independent recurring jobs on a fixed interval. Generic by
 * design — Product Bible §17 lists many jobs (reasoning pass, nightly repo
 * analysis, conversation summarization, trend analysis, SEO optimization,
 * knowledge cleanup) that will register against the same mechanism; only
 * the composition root decides which jobs exist and whether the scheduler
 * runs at all.
 */
export interface Scheduler {
  /** Registers a named recurring job. Must be called before start(). */
  registerJob(job: ScheduledJob): void;
  /** Begins firing every registered job on its own interval. No-op if already started. */
  start(): void;
  /** Stops all timers. Safe to call multiple times. */
  stop(): void;
}
