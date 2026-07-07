import { RoleId, UserId } from '@wisdum/domain';
import type { Clock, UserRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import { NotFoundError } from '../../shared/errors.js';
import type { AssignRoleCommand } from '../commands/assign-role-command.js';

export class AssignRoleHandler implements CommandHandler<AssignRoleCommand> {
  constructor(
    private readonly repository: UserRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: AssignRoleCommand): Promise<void> {
    const found = await this.repository.findById(UserId.create(command.userId));
    if (!found.some) {
      throw new NotFoundError('User not found', { userId: command.userId });
    }
    const user = found.value;
    user.assignRole(RoleId.create(command.roleId), this.clock);
    await this.repository.save(user);
    await this.events.publishAll(user.pullDomainEvents());
    user.clearDomainEvents();
  }
}
