import { ApiKey, ApiKeyId, PasswordHash } from '@wisdum/domain';
import type { ApiKeyRepository, Clock } from '@wisdum/domain';
import type { CommandHandler } from '../../shared/messages.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { CreateApiKeyCommand } from '../commands/create-api-key-command.js';
import { randomBytes } from 'node:crypto';

export interface CreateApiKeyResult {
  readonly apiKeyId: string;
  readonly plaintextKey: string;
}

export class CreateApiKeyHandler implements CommandHandler<CreateApiKeyCommand, CreateApiKeyResult> {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResult> {
    const rawSecret = `w_sk_${randomBytes(24).toString('hex')}`;
    const hashStr = await this.hasher.hash(rawSecret);
    const keyHash = PasswordHash.create(hashStr);

    const id = ApiKeyId.create(this.ids.nextId());
    const apiKey = ApiKey.create(
      {
        id,
        tenantId: command.tenantId,
        ownerId: command.ownerId,
        ownerType: 'user',
        label: command.label,
        keyHash,
        scopes: [],
      },
      this.clock,
    );

    await this.repository.save(apiKey);
    await this.events.publishAll(apiKey.pullDomainEvents());
    apiKey.clearDomainEvents();

    return {
      apiKeyId: id.value(),
      plaintextKey: rawSecret,
    };
  }
}
