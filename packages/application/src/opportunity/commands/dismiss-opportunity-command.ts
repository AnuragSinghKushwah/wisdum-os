import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface DismissOpportunityCommand extends Command {
  readonly kind: 'command';
  readonly opportunityId: string;
  readonly tenantId: TenantId;
}

export function dismissOpportunityCommand(
  props: Omit<DismissOpportunityCommand, 'kind'>,
): DismissOpportunityCommand {
  return { kind: 'command', ...props };
}
