import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface AuthenticateUserCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly email: string;
  readonly password: string;
}

export function authenticateUserCommand(
  props: Omit<AuthenticateUserCommand, 'kind'>,
): AuthenticateUserCommand {
  return { kind: 'command', ...props };
}
