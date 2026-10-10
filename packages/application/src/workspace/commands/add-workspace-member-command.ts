import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface AddWorkspaceMemberCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: 'owner' | 'admin' | 'member' | 'guest';
}

export function addWorkspaceMemberCommand(
  props: Omit<AddWorkspaceMemberCommand, 'kind'>,
): AddWorkspaceMemberCommand {
  return { kind: 'command', ...props };
}
