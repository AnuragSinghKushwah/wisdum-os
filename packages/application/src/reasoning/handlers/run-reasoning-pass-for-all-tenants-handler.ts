import type { TenantId } from '@wisdum/types';
import type { TenantDirectory } from '../../shared/ports.js';
import { runReasoningPassCommand } from '../commands/run-reasoning-pass-command.js';
import type { ReasoningResultDto } from '../dto/reasoning-result-dto.js';
import type { RunReasoningPassHandler } from './run-reasoning-pass-handler.js';

/** One tenant's outcome: either its result, or the error that stopped it — never both. */
export type TenantReasoningOutcome =
  | { readonly tenantId: TenantId; readonly status: 'ok'; readonly result: ReasoningResultDto }
  | { readonly tenantId: TenantId; readonly status: 'error'; readonly error: unknown };

export interface RunReasoningPassForAllTenantsResult {
  readonly outcomes: readonly TenantReasoningOutcome[];
}

/**
 * Runs one reasoning pass per tenant, in sequence — deliberately not
 * parallel: each pass makes real, billed LLM calls, and this runs
 * unattended with no latency requirement, so there's no benefit to
 * concurrency, only burst cost/rate-limit risk. Isolates failures: one
 * tenant's error (malformed LLM response, transient API error, ...) is
 * captured in its outcome and does not stop the remaining tenants.
 * Returns a structured result rather than logging — the application layer
 * never depends on `@wisdum/logger`; the composition root (the scheduler)
 * logs from the returned outcomes. Exists to be invoked by the scheduler,
 * not by any HTTP route — the manual per-tenant trigger stays
 * `RunReasoningPassHandler` via `POST /v1/reasoning/run`.
 */
export class RunReasoningPassForAllTenantsHandler {
  constructor(
    private readonly tenants: TenantDirectory,
    private readonly runReasoningPass: RunReasoningPassHandler,
  ) {}

  async execute(): Promise<RunReasoningPassForAllTenantsResult> {
    const tenantIds = await this.tenants.listAllTenantIds();
    const outcomes: TenantReasoningOutcome[] = [];
    for (const tenantId of tenantIds) {
      try {
        const result = await this.runReasoningPass.execute(runReasoningPassCommand({ tenantId }));
        outcomes.push({ tenantId, status: 'ok', result });
      } catch (error) {
        outcomes.push({ tenantId, status: 'error', error });
      }
    }
    return { outcomes };
  }
}
