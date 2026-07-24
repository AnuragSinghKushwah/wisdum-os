import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateAgentTaskCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly agentType: string;
  readonly payload: Record<string, any>;
}

export function createAgentTaskCommand(
  props: Omit<CreateAgentTaskCommand, 'kind'>,
): CreateAgentTaskCommand {
  return { kind: 'command', ...props };
}
