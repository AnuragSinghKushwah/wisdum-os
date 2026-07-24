import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntervalScheduler } from './interval-scheduler.js';

describe('IntervalScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires two jobs independently on their own intervals', async () => {
    const scheduler = new IntervalScheduler();
    const calls: string[] = [];
    scheduler.registerJob({ name: 'fast', intervalMs: 10, task: () => { calls.push('fast'); return Promise.resolve(); } });
    scheduler.registerJob({ name: 'slow', intervalMs: 30, task: () => { calls.push('slow'); return Promise.resolve(); } });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(30);

    expect(calls.filter((c) => c === 'fast')).toHaveLength(3);
    expect(calls.filter((c) => c === 'slow')).toHaveLength(1);
  });

  it('skips a tick while the previous run of that job is still in flight', async () => {
    const scheduler = new IntervalScheduler();
    let callCount = 0;
    let resolveFirst: (() => void) | undefined;
    scheduler.registerJob({
      name: 'slow-task',
      intervalMs: 10,
      task: () => {
        callCount += 1;
        if (callCount === 1) {
          return new Promise<void>((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve();
      },
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(10); // fires the first (still-pending) run
    await vi.advanceTimersByTimeAsync(30); // several more ticks while it's in flight

    expect(callCount).toBe(1);

    resolveFirst?.();
    await vi.advanceTimersByTimeAsync(0); // let the in-flight promise settle
    await vi.advanceTimersByTimeAsync(10); // next tick can now start

    expect(callCount).toBe(2);
  });

  it('isolates a failing job: onJobError is called and an unrelated job keeps firing', async () => {
    const errors: Array<{ jobName: string; error: unknown }> = [];
    const scheduler = new IntervalScheduler((jobName, error) => {
      errors.push({ jobName, error });
    });
    let okCalls = 0;
    scheduler.registerJob({
      name: 'failing',
      intervalMs: 10,
      task: () => Promise.reject(new Error('boom')),
    });
    scheduler.registerJob({
      name: 'ok',
      intervalMs: 10,
      task: () => { okCalls += 1; return Promise.resolve(); },
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(30);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.jobName === 'failing')).toBe(true);
    expect(okCalls).toBe(3);
  });

  it('stop() halts all timers', async () => {
    const scheduler = new IntervalScheduler();
    let calls = 0;
    scheduler.registerJob({ name: 'job', intervalMs: 10, task: () => { calls += 1; return Promise.resolve(); } });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toBe(1);

    scheduler.stop();
    await vi.advanceTimersByTimeAsync(50);
    expect(calls).toBe(1);
  });

  it('rejects registering two jobs with the same name', () => {
    const scheduler = new IntervalScheduler();
    scheduler.registerJob({ name: 'dup', intervalMs: 10, task: () => Promise.resolve() });
    expect(() =>
      scheduler.registerJob({ name: 'dup', intervalMs: 20, task: () => Promise.resolve() }),
    ).toThrow();
  });
});
