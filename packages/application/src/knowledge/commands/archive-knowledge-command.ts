import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface ArchiveKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly knowledgeId: string;
}

export function archiveKnowledgeCommand(
  props: Omit<ArchiveKnowledgeCommand, 'kind'>,
): ArchiveKnowledgeCommand {
  return { kind: 'command', ...props };
}
