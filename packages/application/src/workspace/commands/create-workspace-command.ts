import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateWorkspaceCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly organizationId: string;
  readonly name: string;
  readonly createdBy: string;
}

export function createWorkspaceCommand(
  props: Omit<CreateWorkspaceCommand, 'kind'>,
): CreateWorkspaceCommand {
  return { kind: 'command', ...props };
}
