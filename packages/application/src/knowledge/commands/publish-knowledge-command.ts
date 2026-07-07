import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** Moves a knowledge asset from draft/processed state to active (published). */
export interface PublishKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly knowledgeId: string;
}

export function publishKnowledgeCommand(
  props: Omit<PublishKnowledgeCommand, 'kind'>,
): PublishKnowledgeCommand {
  return { kind: 'command', ...props };
}
