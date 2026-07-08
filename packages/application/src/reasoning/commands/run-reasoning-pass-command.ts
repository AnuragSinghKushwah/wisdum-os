import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/**
 * Manually triggers one pass of the Core Loop's Observe -> Understand ->
 * Connect -> Reason -> Insight -> Opportunity steps (Product Bible §5)
 * over every captured Knowledge asset in the tenant.
 */
export interface RunReasoningPassCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
}

export function runReasoningPassCommand(
  props: Omit<RunReasoningPassCommand, 'kind'>,
): RunReasoningPassCommand {
  return { kind: 'command', ...props };
}
