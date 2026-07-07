import type { Command } from '../../shared/messages.js';

export interface AssignRoleCommand extends Command {
  readonly kind: 'command';
  readonly userId: string;
  readonly roleId: string;
}

export function assignRoleCommand(props: Omit<AssignRoleCommand, 'kind'>): AssignRoleCommand {
  return { kind: 'command', ...props };
}
