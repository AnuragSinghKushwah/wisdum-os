import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface DisablePluginCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly pluginId: string;
}

export function disablePluginCommand(
  props: Omit<DisablePluginCommand, 'kind'>,
): DisablePluginCommand {
  return { kind: 'command', ...props };
}
