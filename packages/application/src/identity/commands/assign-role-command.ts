import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface AssignRoleCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly roleId: string;
  /** What the person assigning the role holds; they cannot hand out more than that. */
  readonly grantorPermissions: readonly string[];
}

export function assignRoleCommand(props: Omit<AssignRoleCommand, 'kind'>): AssignRoleCommand {
  return { kind: 'command', ...props };
}
