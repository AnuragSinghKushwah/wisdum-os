import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, Option, TenantId } from '@wisdum/types';
import { DisplayName, Email, PasswordHash, User, UserId } from '@wisdum/domain';
import type { Clock, UserRepository } from '@wisdum/domain';
import { authenticateUserCommand } from '../commands/authenticate-user-command.js';
import { AuthenticateUserHandler } from './authenticate-user-handler.js';
import type { PasswordHasher } from '../ports/password-hasher.js';
import type { AuthTokenPayload, TokenService } from '../ports/token-service.js';
import { AuthenticationError } from '../../shared/errors.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

class FakeUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();

  async findById(id: UserId): Promise<Option<User>> {
    const user = this.byId.get(id.value());
    return Promise.resolve(user === undefined ? { some: false } : { some: true, value: user });
  }

  async findByEmail(tenantId: TenantId, email: Email): Promise<Option<User>> {
    for (const user of this.byId.values()) {
      if (user.tenantId === tenantId && user.email.value === email.value) {
        return Promise.resolve({ some: true, value: user });
      }
    }
    return Promise.resolve({ some: false });
  }

  async exists(id: UserId): Promise<boolean> {
    return Promise.resolve(this.byId.has(id.value()));
  }

  async save(user: User): Promise<void> {
    this.byId.set(user.getId().value(), user);
    return Promise.resolve();
  }

  async delete(user: User): Promise<void> {
    this.byId.delete(user.getId().value());
    return Promise.resolve();
  }
}

/** Reverses the plaintext so hash !== plaintext while remaining checkable. */
const fakeHasher: PasswordHasher = {
  hash: (plaintext) => Promise.resolve(`${[...plaintext].reverse().join('')}-hashed-secret-value`),
  verify: (plaintext, hash) =>
    Promise.resolve(hash === `${[...plaintext].reverse().join('')}-hashed-secret-value`),
};

class FakeTokenService implements TokenService {
  issued: AuthTokenPayload | undefined;

  async issue(payload: AuthTokenPayload): Promise<string> {
    this.issued = payload;
    return Promise.resolve('fake-token');
  }

  async verify(): Promise<AuthTokenPayload> {
    throw new Error('not used in this test');
  }
}

async function createUserWithPassword(email: string, password: string): Promise<User> {
  return User.create(
    {
      id: UserId.create('11111111-1111-1111-1111-111111111111'),
      tenantId: TENANT_ID,
      email: Email.create(email),
      displayName: DisplayName.create('Ada Lovelace'),
      passwordHash: PasswordHash.create(await fakeHasher.hash(password)),
    },
    clock,
  );
}

describe('AuthenticateUserHandler', () => {
  it('issues a token when credentials are valid', async () => {
    const repository = new FakeUserRepository();
    await repository.save(await createUserWithPassword('ada@example.com', 'correct-horse'));
    const tokens = new FakeTokenService();
    const handler = new AuthenticateUserHandler(repository, fakeHasher, tokens);

    const result = await handler.execute(
      authenticateUserCommand({
        tenantId: TENANT_ID,
        email: 'ada@example.com',
        password: 'correct-horse',
      }),
    );

    expect(result.token).toBe('fake-token');
    expect(tokens.issued?.tenantId).toBe(TENANT_ID);
  });

  it('rejects an incorrect password without revealing which field was wrong', async () => {
    const repository = new FakeUserRepository();
    await repository.save(await createUserWithPassword('ada@example.com', 'correct-horse'));
    const handler = new AuthenticateUserHandler(repository, fakeHasher, new FakeTokenService());

    await expect(
      handler.execute(
        authenticateUserCommand({
          tenantId: TENANT_ID,
          email: 'ada@example.com',
          password: 'wrong-password',
        }),
      ),
    ).rejects.toThrow(AuthenticationError);
  });

  it('rejects an unknown email', async () => {
    const repository = new FakeUserRepository();
    const handler = new AuthenticateUserHandler(repository, fakeHasher, new FakeTokenService());

    await expect(
      handler.execute(
        authenticateUserCommand({
          tenantId: TENANT_ID,
          email: 'nobody@example.com',
          password: 'irrelevant',
        }),
      ),
    ).rejects.toThrow(AuthenticationError);
  });

  it('rejects a user with no password hash set (SSO-only account)', async () => {
    const repository = new FakeUserRepository();
    const ssoUser = User.create(
      {
        id: UserId.create('22222222-2222-2222-2222-222222222222'),
        tenantId: TENANT_ID,
        email: Email.create('sso@example.com'),
        displayName: DisplayName.create('SSO User'),
      },
      clock,
    );
    await repository.save(ssoUser);
    const handler = new AuthenticateUserHandler(repository, fakeHasher, new FakeTokenService());

    await expect(
      handler.execute(
        authenticateUserCommand({
          tenantId: TENANT_ID,
          email: 'sso@example.com',
          password: 'anything',
        }),
      ),
    ).rejects.toThrow(AuthenticationError);
  });
});
