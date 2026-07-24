import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface RevokeApiKeyCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly apiKeyId: string;
}

export function revokeApiKeyCommand(props: Omit<RevokeApiKeyCommand, 'kind'>): RevokeApiKeyCommand {
  return { kind: 'command', ...props };
}
