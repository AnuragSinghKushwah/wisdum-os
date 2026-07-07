import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateUserCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly email: string;
  readonly displayName: string;
  readonly password?: string;
}

export function createUserCommand(props: Omit<CreateUserCommand, 'kind'>): CreateUserCommand {
  return { kind: 'command', ...props };
}
