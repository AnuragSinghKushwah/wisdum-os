import type { Command } from '../../shared/messages.js';

export interface ReplaceDocumentContentCommand extends Command {
  readonly kind: 'command';
  readonly documentId: string;
  readonly content: string;
  readonly encoding: string;
}

export function replaceDocumentContentCommand(
  props: Omit<ReplaceDocumentContentCommand, 'kind'>,
): ReplaceDocumentContentCommand {
  return { kind: 'command', ...props };
}
