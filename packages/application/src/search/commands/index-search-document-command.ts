import type { SearchSourceType } from '@wisdum/domain';
import type { Command } from '../../shared/messages.js';

export interface IndexSearchDocumentCommand extends Command {
  readonly kind: 'command';
  readonly searchIndexId: string;
  readonly sourceId: string;
  readonly sourceType: SearchSourceType;
  readonly text: string;
  readonly chunkCount?: number;
}

export function indexSearchDocumentCommand(
  props: Omit<IndexSearchDocumentCommand, 'kind'>,
): IndexSearchDocumentCommand {
  return { kind: 'command', ...props };
}
