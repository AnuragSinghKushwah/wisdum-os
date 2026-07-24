import { ApiKeyId } from '@wisdum/domain';
import type { ApiKeyRepository, Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher } from '../../shared/ports.js';
import type { RevokeApiKeyCommand } from '../commands/revoke-api-key-command.js';
import { NotFoundError, AuthenticationError } from '../../shared/errors.js';

export class RevokeApiKeyHandler implements CommandHandler<RevokeApiKeyCommand, void> {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: RevokeApiKeyCommand): Promise<void> {
    const found = await this.repository.findById(ApiKeyId.create(command.apiKeyId));
    if (!found.some) {
      throw new NotFoundError('API key not found', { apiKeyId: command.apiKeyId });
    }
    const apiKey = found.value;
    if (apiKey.tenantId !== command.tenantId) {
      throw new AuthenticationError('Unauthorized access to API key');
    }

    apiKey.revoke(this.clock);
    await this.repository.save(apiKey);
    await this.events.publishAll(apiKey.pullDomainEvents());
    apiKey.clearDomainEvents();
  }
}
