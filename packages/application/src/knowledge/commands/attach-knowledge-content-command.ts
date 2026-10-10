import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** Attaches a reference to stored content (e.g. a Document id) and activates the asset. */
export interface AttachKnowledgeContentCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly knowledgeId: string;
  readonly reference: string;
  readonly mimeType?: string;
}

export function attachKnowledgeContentCommand(
  props: Omit<AttachKnowledgeContentCommand, 'kind'>,
): AttachKnowledgeContentCommand {
  return { kind: 'command', ...props };
}
