import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** Runs one input connector's capture and folds new items into Knowledge/Document (Product Bible §6). */
export interface SyncInputConnectorCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly capability: string;
}

export function syncInputConnectorCommand(
  props: Omit<SyncInputConnectorCommand, 'kind'>,
): SyncInputConnectorCommand {
  return { kind: 'command', ...props };
}
