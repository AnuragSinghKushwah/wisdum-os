import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly title: string;
  readonly type: string;
  readonly visibility: string;
  readonly sourceKind: string;
  readonly sourceUri?: string;
  readonly description?: string;
  readonly labels?: readonly string[];
}

export function createKnowledgeCommand(
  props: Omit<CreateKnowledgeCommand, 'kind'>,
): CreateKnowledgeCommand {
  return { kind: 'command', ...props };
}
