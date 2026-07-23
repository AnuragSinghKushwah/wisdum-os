import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface UpdateKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly knowledgeId: string;
  readonly tenantId: TenantId;
  readonly title?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

export function updateKnowledgeCommand(
  props: Omit<UpdateKnowledgeCommand, 'kind'>,
): UpdateKnowledgeCommand {
  return { kind: 'command', ...props };
}
