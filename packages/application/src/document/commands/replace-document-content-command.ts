import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface ReplaceDocumentContentCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly documentId: string;
  readonly content: string;
  readonly encoding: string;
}

export function replaceDocumentContentCommand(
  props: Omit<ReplaceDocumentContentCommand, 'kind'>,
): ReplaceDocumentContentCommand {
  return { kind: 'command', ...props };
}
