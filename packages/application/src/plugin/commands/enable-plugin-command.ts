import type { Command } from '../../shared/messages.js';

export interface EnablePluginCommand extends Command {
  readonly kind: 'command';
  readonly pluginId: string;
}

export function enablePluginCommand(props: Omit<EnablePluginCommand, 'kind'>): EnablePluginCommand {
  return { kind: 'command', ...props };
}
