import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface ExecuteAgentTaskCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly taskId: string;
}

export function executeAgentTaskCommand(
  props: Omit<ExecuteAgentTaskCommand, 'kind'>,
): ExecuteAgentTaskCommand {
  return { kind: 'command', ...props };
}
