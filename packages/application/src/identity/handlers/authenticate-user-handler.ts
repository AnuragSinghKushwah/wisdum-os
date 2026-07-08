import { Email } from '@wisdum/domain';
import type { UserRepository } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import { AuthenticationError } from '../../shared/errors.js';
import type { AuthenticateUserCommand } from '../commands/authenticate-user-command.js';
import type { AuthResultDto } from '../dto/auth-result-dto.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { TokenService } from '../ports/token-service.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export class AuthenticateUserHandler
  implements CommandHandler<AuthenticateUserCommand, AuthResultDto>
{
  constructor(
    private readonly repository: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(command: AuthenticateUserCommand): Promise<AuthResultDto> {
    const email = Email.create(command.email);
    const found = await this.repository.findByEmail(command.tenantId, email);
    const passwordHash = found.some ? found.value.passwordHash : undefined;
    if (!found.some || passwordHash === undefined) {
      throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    }

    const user = found.value;
    const valid = await this.hasher.verify(command.password, passwordHash.value);
    if (!valid) {
      throw new AuthenticationError(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = await this.tokens.issue({
      userId: user.getId().value(),
      tenantId: command.tenantId,
      roleIds: user.roleIds.map((roleId) => roleId.value()),
    });

    return { userId: user.getId().value(), token };
  }
}
