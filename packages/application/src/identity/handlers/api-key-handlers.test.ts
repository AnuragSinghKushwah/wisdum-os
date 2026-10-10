import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId, UUID } from '@wisdum/types';
import { ApiKey, ApiKeyId, PasswordHash, PermissionName } from '@wisdum/domain';
import type { ApiKeyRepository, Clock } from '@wisdum/domain';
import { createApiKeyCommand } from '../commands/create-api-key-command.js';
import { authenticateApiKeyQuery } from '../queries/authenticate-api-key-query.js';
import type { ApiKeyHasher } from '../ports/api-key-hasher.js';
import type { DomainEventPublisher, IdGenerator } from '../../shared/ports.js';
import { AuthenticationError } from '../../shared/errors.js';
import { AuthenticateApiKeyHandler } from './authenticate-api-key-handler.js';
import { API_KEY_PREFIX, CreateApiKeyHandler } from './create-api-key-handler.js';

const TENANT_ID = '11111111-1111-4111-8111-111111111111' as TenantId;
const OWNER_ID = '22222222-2222-4222-8222-222222222222' as UUID;
const KEY_ID = '33333333-3333-4333-8333-333333333333' as UUID;
/** What the person minting keys in these tests holds. */
const GRANTOR = ['knowledge:*', 'document:*'];

const NOW = '2024-01-01T00:00:00.000Z' as IsoTimestamp;
const clock: Clock = { now: () => NOW };

class FakeApiKeyRepository implements ApiKeyRepository {
  readonly saved: ApiKey[] = [];

  findById(id: ApiKeyId): Promise<Option<ApiKey>> {
    const found = this.saved.find((key) => key.getId().equals(id));
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }

  findByKeyHash(keyHash: PasswordHash): Promise<Option<ApiKey>> {
    const found = this.saved.find((key) => key.keyHash.equals(keyHash));
    return Promise.resolve(found === undefined ? { some: false } : { some: true, value: found });
  }

  save(apiKey: ApiKey): Promise<void> {
    this.saved.push(apiKey);
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/** Not a real digest; stable and long enough to satisfy `PasswordHash`. */
const hasher: ApiKeyHasher = { hash: (plaintext) => `digest-of-${plaintext}-padding-padding` };
const ids: IdGenerator = { nextId: () => KEY_ID };
const events: DomainEventPublisher = { publishAll: () => Promise.resolve() };

function setup() {
  const repository = new FakeApiKeyRepository();
  return {
    repository,
    create: new CreateApiKeyHandler(repository, hasher, ids, events, clock),
    authenticate: new AuthenticateApiKeyHandler(repository, hasher, clock),
  };
}

describe('CreateApiKeyHandler', () => {
  it('stores only the hash and returns a prefixed plaintext key once', async () => {
    const { repository, create } = setup();
    const result = await create.execute(
      createApiKeyCommand({
        tenantId: TENANT_ID,
        ownerId: OWNER_ID,
        label: 'ci',
        scopes: ['knowledge:write'],
        grantorPermissions: GRANTOR,
      }),
    );

    expect(result.plaintextKey.startsWith(API_KEY_PREFIX)).toBe(true);
    const stored = repository.saved[0];
    expect(stored?.keyHash.value).toBe(hasher.hash(result.plaintextKey));
    expect(stored?.keyHash.value).not.toBe(result.plaintextKey);
    expect(stored?.scopes.map((scope) => scope.value)).toEqual(['knowledge:write']);
  });

  it('rejects a key with no scopes', async () => {
    const { create } = setup();
    await expect(
      create.execute(
        createApiKeyCommand({
          tenantId: TENANT_ID,
          ownerId: OWNER_ID,
          label: 'x',
          scopes: [],
          grantorPermissions: GRANTOR,
        }),
      ),
    ).rejects.toThrow('at least one scope');
  });

  it('rejects a malformed permission name', async () => {
    const { create } = setup();
    await expect(
      create.execute(
        createApiKeyCommand({
          tenantId: TENANT_ID,
          ownerId: OWNER_ID,
          label: 'x',
          scopes: ['not a permission'],
          grantorPermissions: GRANTOR,
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses to mint a key that carries more than its creator holds', async () => {
    const { repository, create } = setup();
    const attempt = (scopes: string[], grantorPermissions: string[]) =>
      create.execute(
        createApiKeyCommand({
          tenantId: TENANT_ID,
          ownerId: OWNER_ID,
          label: 'x',
          scopes,
          grantorPermissions,
        }),
      );

    await expect(attempt(['user:manage'], ['knowledge:*'])).rejects.toThrow('do not hold');
    await expect(attempt(['knowledge:write'], ['knowledge:read'])).rejects.toThrow('do not hold');
    // Holding some actions on a resource is not holding the wildcard.
    await expect(attempt(['knowledge:*'], ['knowledge:read', 'knowledge:write'])).rejects.toThrow(
      'do not hold',
    );
    expect(repository.saved).toHaveLength(0);

    await expect(attempt(['knowledge:write'], ['knowledge:*'])).resolves.toBeDefined();
  });

  it('collapses duplicate scopes', async () => {
    const { repository, create } = setup();
    await create.execute(
      createApiKeyCommand({
        tenantId: TENANT_ID,
        ownerId: OWNER_ID,
        label: 'x',
        scopes: ['knowledge:read', 'Knowledge:Read', 'document:read'],
        grantorPermissions: GRANTOR,
      }),
    );
    expect(repository.saved[0]?.scopes.map((scope) => scope.value)).toEqual([
      'knowledge:read',
      'document:read',
    ]);
  });
});

describe('AuthenticateApiKeyHandler', () => {
  it('resolves a valid key to its tenant, owner, and scopes', async () => {
    const { create, authenticate } = setup();
    const { plaintextKey } = await create.execute(
      createApiKeyCommand({
        tenantId: TENANT_ID,
        ownerId: OWNER_ID,
        label: 'ci',
        scopes: ['knowledge:write', 'document:read'],
        grantorPermissions: GRANTOR,
      }),
    );

    const principal = await authenticate.execute(authenticateApiKeyQuery({ plaintextKey }));

    expect(principal).toEqual({
      apiKeyId: KEY_ID,
      tenantId: TENANT_ID,
      ownerId: OWNER_ID,
      ownerType: 'user',
      scopes: ['knowledge:write', 'document:read'],
    });
  });

  it('gives an unknown key the same error as any other failure', async () => {
    const { authenticate } = setup();
    await expect(
      authenticate.execute(authenticateApiKeyQuery({ plaintextKey: `${API_KEY_PREFIX}nope` })),
    ).rejects.toThrow(new AuthenticationError('Invalid API key'));
  });

  it('rejects a credential without the API key prefix before touching the store', async () => {
    const { authenticate } = setup();
    await expect(
      authenticate.execute(authenticateApiKeyQuery({ plaintextKey: 'dev-webhook-key' })),
    ).rejects.toThrow('Invalid API key');
  });

  it('rejects oversized input', async () => {
    const { authenticate } = setup();
    await expect(
      authenticate.execute(
        authenticateApiKeyQuery({ plaintextKey: `${API_KEY_PREFIX}${'a'.repeat(1000)}` }),
      ),
    ).rejects.toThrow('Invalid API key');
  });

  it('rejects a revoked key', async () => {
    const { repository, create, authenticate } = setup();
    const { plaintextKey } = await create.execute(
      createApiKeyCommand({
        tenantId: TENANT_ID,
        ownerId: OWNER_ID,
        label: 'ci',
        scopes: ['knowledge:read'],
        grantorPermissions: GRANTOR,
      }),
    );
    repository.saved[0]?.revoke(clock);

    await expect(authenticate.execute(authenticateApiKeyQuery({ plaintextKey }))).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('rejects an expired key', async () => {
    const repository = new FakeApiKeyRepository();
    const plaintextKey = `${API_KEY_PREFIX}abc123`;
    const issuedAt = '2024-01-01T00:00:00.000Z' as IsoTimestamp;
    const expiry = '2024-02-01T00:00:00.000Z' as IsoTimestamp;
    await repository.save(
      ApiKey.create(
        {
          id: ApiKeyId.create(KEY_ID),
          tenantId: TENANT_ID,
          ownerId: OWNER_ID,
          ownerType: 'user',
          label: 'short-lived',
          keyHash: PasswordHash.create(hasher.hash(plaintextKey)),
          scopes: [PermissionName.create('knowledge:read')],
          expiresAt: expiry,
        },
        { now: () => issuedAt },
      ),
    );
    const authenticate = new AuthenticateApiKeyHandler(repository, hasher, {
      now: () => '2024-03-01T00:00:00.000Z' as IsoTimestamp,
    });

    await expect(authenticate.execute(authenticateApiKeyQuery({ plaintextKey }))).rejects.toThrow(
      'Invalid API key',
    );
  });
});
