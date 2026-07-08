import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface UpdateContentDraftCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly draftId: string;
  readonly title: string;
  readonly body: string;
}

export function updateContentDraftCommand(
  props: Omit<UpdateContentDraftCommand, 'kind'>,
): UpdateContentDraftCommand {
  return { kind: 'command', ...props };
}
