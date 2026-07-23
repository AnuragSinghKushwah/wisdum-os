import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface ChangeKnowledgeVisibilityCommand extends Command {
  readonly kind: 'command';
  readonly knowledgeId: string;
  readonly tenantId: TenantId;
  readonly visibility: 'private' | 'workspace' | 'public';
}

export function changeKnowledgeVisibilityCommand(
  props: Omit<ChangeKnowledgeVisibilityCommand, 'kind'>,
): ChangeKnowledgeVisibilityCommand {
  return { kind: 'command', ...props };
}
