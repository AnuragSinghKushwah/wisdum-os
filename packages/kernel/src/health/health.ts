import { Registry } from '../registry/registry.js';

export const HEALTH_STATES = ['healthy', 'degraded', 'unhealthy'] as const;
export type HealthState = (typeof HEALTH_STATES)[number];

/** Outcome of one health probe. */
export interface HealthCheckResult {
  readonly status: HealthState;
  readonly detail?: string;
}

/** A named probe contributed by a module or plugin (e.g. `database`, `search`). */
export interface HealthCheck {
  readonly name: string;
  check(): Promise<HealthCheckResult>;
}

/** Aggregated health of the whole kernel. */
export interface HealthReport {
  readonly status: HealthState;
  readonly checks: Readonly<Record<string, HealthCheckResult>>;
}

/**
 * Collects health checks and aggregates them: unhealthy dominates degraded,
 * degraded dominates healthy. A throwing probe reports unhealthy instead of
 * failing the whole report.
 */
export class HealthRegistry {
  private readonly registry = new Registry<HealthCheck>('HealthCheck');

  register(check: HealthCheck): void {
    this.registry.register(check.name, check);
  }

  unregister(name: string): void {
    this.registry.unregister(name);
  }

  async report(): Promise<HealthReport> {
    const checks: Record<string, HealthCheckResult> = {};
    let status: HealthState = 'healthy';
    for (const check of this.registry.values()) {
      let result: HealthCheckResult;
      try {
        result = await check.check();
      } catch (error) {
        result = {
          status: 'unhealthy',
          detail: error instanceof Error ? error.message : 'health check threw',
        };
      }
      checks[check.name] = result;
      if (result.status === 'unhealthy') status = 'unhealthy';
      else if (result.status === 'degraded' && status === 'healthy') status = 'degraded';
    }
    return { status, checks };
  }
}
