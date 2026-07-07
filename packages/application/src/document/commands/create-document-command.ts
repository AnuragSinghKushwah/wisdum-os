import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateDocumentCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly content: string;
  readonly mimeType: string;
  readonly encoding: string;
  readonly language?: string;
}

export function createDocumentCommand(
  props: Omit<CreateDocumentCommand, 'kind'>,
): CreateDocumentCommand {
  return { kind: 'command', ...props };
}
