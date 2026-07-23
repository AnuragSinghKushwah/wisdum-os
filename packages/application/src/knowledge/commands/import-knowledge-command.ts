import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface ImportKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly knowledgeId: string;
  readonly tenantId: TenantId;
  readonly sourceKind: string;
  readonly sourceUri?: string;
}

export function importKnowledgeCommand(
  props: Omit<ImportKnowledgeCommand, 'kind'>,
): ImportKnowledgeCommand {
  return { kind: 'command', ...props };
}
