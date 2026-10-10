import { PermissionSet, RoleId, UserId } from '@wisdum/domain';
import type { Clock, UserRepository } from '@wisdum/domain';
import { ValidationError } from '@wisdum/errors';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { AuthorizationError, NotFoundError } from '../../shared/errors.js';
import type { AccessPolicy } from '../access/access-policy.js';
import type { AssignRoleCommand } from '../commands/assign-role-command.js';

export class AssignRoleHandler implements CommandHandler<AssignRoleCommand> {
  constructor(
    private readonly repository: UserRepository,
    private readonly access: AccessPolicy,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AssignRoleCommand): Promise<void> {
    const found = await this.repository.findById(UserId.create(command.userId));
    // A user in another tenant is reported exactly like a missing one.
    if (!found.some || found.value.tenantId !== command.tenantId) {
      throw new NotFoundError('User not found', { userId: command.userId });
    }

    const roleName = this.access.systemRoleName(command.tenantId, command.roleId);
    if (roleName === undefined) {
      throw new ValidationError('Unknown role', { roleId: command.roleId });
    }
    const granted = this.access.permissionsOfSystemRole(roleName);
    if (!PermissionSet.of(command.grantorPermissions).includesAll(granted)) {
      throw new AuthorizationError('You cannot assign a role that grants more than you hold', {
        role: roleName,
      });
    }

    const user = found.value;
    user.assignRole(RoleId.create(command.roleId), this.clock);
    await this.repository.save(user);
    await this.events.publishAll(user.pullDomainEvents());
    user.clearDomainEvents();
  }
}
