import type { TenantId, UUID } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateApiKeyCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly ownerId: UUID;
  readonly label: string;
  /** Permissions the key may exercise, as `resource:action` names. Must not be empty. */
  readonly scopes: readonly string[];
}

export function createApiKeyCommand(props: Omit<CreateApiKeyCommand, 'kind'>): CreateApiKeyCommand {
  return { kind: 'command', ...props };
}
