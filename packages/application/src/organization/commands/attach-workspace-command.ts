import type { Command } from '../../shared/messages.js';

export interface AttachWorkspaceCommand extends Command {
  readonly kind: 'command';
  readonly organizationId: string;
  readonly workspaceId: string;
}

export function attachWorkspaceCommand(
  props: Omit<AttachWorkspaceCommand, 'kind'>,
): AttachWorkspaceCommand {
  return { kind: 'command', ...props };
}
