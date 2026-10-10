import { PasswordHash } from '@wisdum/domain';
import type { ApiKeyRepository, Clock } from '@wisdum/domain';
import type { QueryHandler } from '../../shared/messages.js';
import { AuthenticationError } from '../../shared/errors.js';
import type { ApiKeyPrincipalDto } from '../dto/api-key-principal-dto.js';
import type { ApiKeyHasher } from '../ports/api-key-hasher.js';
import type { AuthenticateApiKeyQuery } from '../queries/authenticate-api-key-query.js';
import { API_KEY_PREFIX } from './create-api-key-handler.js';

const INVALID_KEY_MESSAGE = 'Invalid API key';
/** Upper bound on a presented key, so oversized input is rejected before hashing. */
const MAX_KEY_LENGTH = 256;

/**
 * Authenticates an API key. Unknown, malformed, revoked, and expired keys
 * all fail with the same message so a caller cannot probe which keys exist.
 */
export class AuthenticateApiKeyHandler
  implements QueryHandler<AuthenticateApiKeyQuery, ApiKeyPrincipalDto>
{
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly hasher: ApiKeyHasher,
    private readonly clock: Clock,
  ) {}

  async execute(query: AuthenticateApiKeyQuery): Promise<ApiKeyPrincipalDto> {
    const presented = query.plaintextKey;
    if (!presented.startsWith(API_KEY_PREFIX) || presented.length > MAX_KEY_LENGTH) {
      throw new AuthenticationError(INVALID_KEY_MESSAGE);
    }

    const found = await this.repository.findByKeyHash(
      PasswordHash.create(this.hasher.hash(presented)),
    );
    if (!found.some || !found.value.isUsableAt(this.clock.now())) {
      throw new AuthenticationError(INVALID_KEY_MESSAGE);
    }

    const apiKey = found.value;
    return {
      apiKeyId: apiKey.getId().value(),
      tenantId: apiKey.tenantId,
      ownerId: apiKey.ownerId,
      ownerType: apiKey.ownerType,
      scopes: apiKey.scopes.map((scope) => scope.value),
    };
  }
}
