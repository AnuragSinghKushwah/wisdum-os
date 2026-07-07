import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface InstallPluginCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly pluginName: string;
  readonly version: string;
  readonly displayName: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
}

export function installPluginCommand(
  props: Omit<InstallPluginCommand, 'kind'>,
): InstallPluginCommand {
  return { kind: 'command', ...props };
}
