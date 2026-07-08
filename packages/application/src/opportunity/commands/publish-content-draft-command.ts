import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** The Publish step (Product Bible §10): publish a draft's current content. */
export interface PublishContentDraftCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly draftId: string;
}

export function publishContentDraftCommand(
  props: Omit<PublishContentDraftCommand, 'kind'>,
): PublishContentDraftCommand {
  return { kind: 'command', ...props };
}
