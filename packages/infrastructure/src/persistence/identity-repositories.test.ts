import { describe, expect, it } from 'vitest';
import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { DisplayName, Email, User, UserId } from '@wisdum/domain';
import type { Clock } from '@wisdum/domain';
import { assertRepositoryContract } from './repository-contract.test-helper.js';
import { InMemoryUserRepository } from './identity-repositories.js';

const TENANT_ID = 'tenant-1' as TenantId;
const clock: Clock = { now: () => '2024-01-01T00:00:00.000Z' as IsoTimestamp };

function createUser(id: string, email: string) {
  return User.create(
    {
      id: UserId.create(id),
      tenantId: TENANT_ID,
      email: Email.create(email),
      displayName: DisplayName.create('Ada Lovelace'),
    },
    clock,
  );
}

describe('InMemoryUserRepository', () => {
  it('satisfies the generic Repository contract', async () => {
    const repository = new InMemoryUserRepository();
    const id = UserId.create('11111111-1111-1111-1111-111111111111');
    await assertRepositoryContract(repository, createUser(id.value(), 'ada@example.com'), id);
  });

  it('findByEmail() is tenant-scoped', async () => {
    const repository = new InMemoryUserRepository();
    await repository.save(createUser('11111111-1111-1111-1111-111111111111', 'ada@example.com'));

    const found = await repository.findByEmail(TENANT_ID, Email.create('ada@example.com'));
    expect(found.some).toBe(true);

    const otherTenant = await repository.findByEmail(
      'tenant-2' as TenantId,
      Email.create('ada@example.com'),
    );
    expect(otherTenant.some).toBe(false);
  });
});
