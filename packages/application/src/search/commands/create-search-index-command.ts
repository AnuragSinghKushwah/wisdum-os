import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateSearchIndexCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly name: string;
  readonly mode: 'keyword' | 'semantic' | 'hybrid';
}

export function createSearchIndexCommand(
  props: Omit<CreateSearchIndexCommand, 'kind'>,
): CreateSearchIndexCommand {
  return { kind: 'command', ...props };
}
