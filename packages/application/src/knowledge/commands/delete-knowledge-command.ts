import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface DeleteKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly knowledgeId: string;
  readonly tenantId: TenantId;
}

export function deleteKnowledgeCommand(
  props: Omit<DeleteKnowledgeCommand, 'kind'>,
): DeleteKnowledgeCommand {
  return { kind: 'command', ...props };
}
