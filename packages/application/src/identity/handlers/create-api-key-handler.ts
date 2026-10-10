import { ApiKey, ApiKeyId, PasswordHash, PermissionName, PermissionSet } from '@wisdum/domain';
import type { ApiKeyRepository, Clock } from '@wisdum/domain';
import { ValidationError } from '@wisdum/errors';
import type { CommandHandler } from '../../shared/messages.js';
import { AuthorizationError } from '../../shared/errors.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import type { ApiKeyHasher } from '../ports/api-key-hasher.js';
import type { CreateApiKeyCommand } from '../commands/create-api-key-command.js';
import { randomBytes } from 'node:crypto';

/** Prefix that marks a string as a Wisdum API key, so credentials can be told apart cheaply. */
export const API_KEY_PREFIX = 'w_sk_';

export interface CreateApiKeyResult {
  readonly apiKeyId: string;
  /** Shown exactly once; only its hash is stored. */
  readonly plaintextKey: string;
}

export class CreateApiKeyHandler implements CommandHandler<CreateApiKeyCommand, CreateApiKeyResult> {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly hasher: ApiKeyHasher,
    private readonly ids: IdGenerator,
    private readonly events: DomainEventPublisher,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateApiKeyCommand): Promise<CreateApiKeyResult> {
    if (command.scopes.length === 0) {
      throw new ValidationError('An API key needs at least one scope', { field: 'scopes' });
    }
    const distinct = new Map<string, PermissionName>();
    for (const scope of command.scopes) {
      const permission = PermissionName.create(scope);
      distinct.set(permission.value, permission);
    }
    const scopes = [...distinct.values()];

    const requested = PermissionSet.of(scopes.map((scope) => scope.value));
    if (!PermissionSet.of(command.grantorPermissions).includesAll(requested)) {
      throw new AuthorizationError('An API key cannot carry permissions you do not hold', {
        scopes: scopes.map((scope) => scope.value),
      });
    }

    const rawSecret = `${API_KEY_PREFIX}${randomBytes(24).toString('hex')}`;
    const keyHash = PasswordHash.create(this.hasher.hash(rawSecret));

    const id = ApiKeyId.create(this.ids.nextId());
    const apiKey = ApiKey.create(
      {
        id,
        tenantId: command.tenantId,
        ownerId: command.ownerId,
        ownerType: 'user',
        label: command.label,
        keyHash,
        scopes,
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
