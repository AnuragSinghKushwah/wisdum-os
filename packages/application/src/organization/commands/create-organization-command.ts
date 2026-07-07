import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

export interface CreateOrganizationCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly name: string;
}

export function createOrganizationCommand(
  props: Omit<CreateOrganizationCommand, 'kind'>,
): CreateOrganizationCommand {
  return { kind: 'command', ...props };
}
