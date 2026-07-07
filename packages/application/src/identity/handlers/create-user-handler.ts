import { DisplayName, Email, PasswordHash, User, UserId } from '@wisdum/domain';
import type { Clock, UserRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import { ConflictError } from '../../shared/errors.js';
import type { CreateUserCommand } from '../commands/create-user-command.js';
import type { PasswordHasher } from '../ports/password-hasher.js';

export class CreateUserHandler implements CommandHandler<CreateUserCommand, { userId: string }> {
  constructor(
    private readonly repository: UserRepository,
    private readonly ids: IdGenerator,
    private readonly hasher: PasswordHasher,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateUserCommand): Promise<{ userId: string }> {
    const email = Email.create(command.email);
    const existing = await this.repository.findByEmail(command.tenantId, email);
    if (existing.some) {
      throw new ConflictError('A user with this email already exists', { email: email.value });
    }

    const user = User.create(
      {
        id: UserId.create(this.ids.nextId()),
        tenantId: command.tenantId,
        email,
        displayName: DisplayName.create(command.displayName),
        passwordHash:
          command.password !== undefined
            ? PasswordHash.create(await this.hasher.hash(command.password))
            : undefined,
      },
      this.clock,
    );

    await this.repository.save(user);
    await this.events.publishAll(user.pullDomainEvents());
    user.clearDomainEvents();

    return { userId: user.getId().value() };
  }
}
