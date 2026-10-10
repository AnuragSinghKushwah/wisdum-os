import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface AssignRoleCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly roleId: string;
}

export function assignRoleCommand(props: Omit<AssignRoleCommand, 'kind'>): AssignRoleCommand {
  return { kind: 'command', ...props };
}
