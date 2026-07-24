import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface UpdateWorkspaceSettingsCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly workspaceId: string;
  readonly key: string;
  readonly value: any;
}

export function updateWorkspaceSettingsCommand(
  props: Omit<UpdateWorkspaceSettingsCommand, 'kind'>,
): UpdateWorkspaceSettingsCommand {
  return { kind: 'command', ...props };
}
