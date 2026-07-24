import { RunReasoningPassForAllTenantsHandler } from '@wisdum/application';
import type { TenantDirectory } from '@wisdum/application';
import { InMemoryTenantDirectory, PostgresTenantDirectory } from '@wisdum/infrastructure';
import { IntervalScheduler } from '@wisdum/platform-jobs';
import type { Scheduler } from '@wisdum/platform-jobs';
import { optionalEnv } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';
import type { Container, KernelModule } from '@wisdum/kernel';
import { PG_POOL, REASONING_HANDLERS, SCHEDULER } from '../tokens.js';

const DEFAULT_REASONING_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const REASONING_JOB_NAME = 'reasoning-pass-all-tenants';

/**
 * Wires the generic in-process scheduler and registers the one concrete
 * job that exists today: an automatic, per-tenant reasoning pass (Product
 * Bible §12/§17 — "the user should sleep, Wisdum should work"). Disabled
 * by default: an unattended, repeating LLM call per tenant costs real
 * money, so an operator must opt in via `SCHEDULER_ENABLED=true`. Future
 * jobs (nightly repo analysis, summarization, SEO, cleanup) register
 * against the same `scheduler.registerJob(...)` mechanism — this module
 * owns only the scheduler instance and the reasoning job.
 */
export class SchedulerModule implements KernelModule {
  readonly name = 'scheduler';
  readonly dependsOn = ['core', 'reasoning'];
  private scheduler: Scheduler | undefined;

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    const tenants: TenantDirectory =
      pool !== undefined ? new PostgresTenantDirectory(pool) : new InMemoryTenantDirectory();

    const logger = createLogger('scheduler');
    const scheduler = new IntervalScheduler((jobName, error) => {
      logger.error('Scheduled job failed', {
        job: jobName,
        error: error instanceof Error ? error.message : error,
      });
    });

    const runForAllTenants = new RunReasoningPassForAllTenantsHandler(
      tenants,
      container.resolve(REASONING_HANDLERS).run,
    );

    scheduler.registerJob({
      name: REASONING_JOB_NAME,
      intervalMs: Number(
        optionalEnv('REASONING_SCHEDULE_INTERVAL_MS', String(DEFAULT_REASONING_INTERVAL_MS)),
      ),
      task: async () => {
        const { outcomes } = await runForAllTenants.execute();
        const failed = outcomes.filter((outcome) => outcome.status === 'error');
        logger.info('Reasoning pass batch complete', {
          tenants: outcomes.length,
          failed: failed.length,
        });
        for (const outcome of failed) {
          if (outcome.status !== 'error') continue;
          logger.error('Reasoning pass failed for tenant', {
            tenantId: outcome.tenantId,
            error: outcome.error instanceof Error ? outcome.error.message : outcome.error,
          });
        }
      },
    });

    this.scheduler = scheduler;
    container.registerValue(SCHEDULER, scheduler);
  }

  start(): Promise<void> {
    if (optionalEnv('SCHEDULER_ENABLED', 'false') === 'true') {
      this.scheduler?.start();
    }
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.scheduler?.stop();
    return Promise.resolve();
  }
}
