import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface StartConversationCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly provider: string;
  readonly modelName: string;
  readonly ownerId: string;
  readonly title?: string;
}

export function startConversationCommand(
  props: Omit<StartConversationCommand, 'kind'>,
): StartConversationCommand {
  return { kind: 'command', ...props };
}
