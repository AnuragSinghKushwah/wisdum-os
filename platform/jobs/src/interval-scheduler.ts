import { Registry } from '@wisdum/kernel';
import type { ScheduledJob, Scheduler } from './scheduler.js';

/**
 * `setInterval`-based `Scheduler`, correctly scoped for a single API
 * instance. If this process is ever horizontally scaled to N>1 replicas,
 * every replica fires every job independently — N-fold duplicate runs and
 * cost. A distributed lock or a real queue (BullMQ, given Redis is already
 * provisioned) is the fix, and is deliberately out of scope here.
 */
export class IntervalScheduler implements Scheduler {
  private readonly jobs = new Registry<ScheduledJob>('scheduled-job');
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly inFlight = new Set<string>();
  private started = false;

  constructor(private readonly onJobError?: (jobName: string, error: unknown) => void) {}

  registerJob(job: ScheduledJob): void {
    this.jobs.register(job.name, job);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const job of this.jobs.values()) {
      const timer = setInterval(() => {
        void this.tick(job);
      }, job.intervalMs);
      timer.unref?.();
      this.timers.set(job.name, timer);
    }
  }

  stop(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.started = false;
  }

  private async tick(job: ScheduledJob): Promise<void> {
    // Overlap protection: skip this tick entirely if the previous run of
    // this job hasn't finished — never queue, never run concurrently.
    if (this.inFlight.has(job.name)) return;
    this.inFlight.add(job.name);
    try {
      await job.task();
    } catch (error) {
      this.onJobError?.(job.name, error);
    } finally {
      this.inFlight.delete(job.name);
    }
  }
}
