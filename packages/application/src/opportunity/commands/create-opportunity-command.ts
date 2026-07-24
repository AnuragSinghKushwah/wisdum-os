import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateOpportunityCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly title: string;
  readonly type: string;
  readonly rationale: string;
}

export function createOpportunityCommand(
  props: Omit<CreateOpportunityCommand, 'kind'>,
): CreateOpportunityCommand {
  return { kind: 'command', ...props };
}
