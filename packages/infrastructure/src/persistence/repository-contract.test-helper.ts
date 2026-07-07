import { expect } from 'vitest';
import type { AggregateRoot, Identifier, Repository } from '@wisdum/domain';

/**
 * Runs the generic `Repository<T>` contract against any implementation:
 * save persists, findById round-trips by identity, delete removes, and a
 * fresh repository starts empty. Shared across every in-memory adapter's
 * test file so the contract is asserted once per repository, not
 * reimplemented ad hoc.
 */
export async function assertRepositoryContract<
  TId extends Identifier<string>,
  TAggregate extends AggregateRoot<TId>,
>(repository: Repository<TAggregate>, aggregate: TAggregate, id: TId): Promise<void> {
  const beforeSave = await repository.findById(id);
  expect(beforeSave.some).toBe(false);

  await repository.save(aggregate);
  const afterSave = await repository.findById(id);
  expect(afterSave.some).toBe(true);
  if (afterSave.some) {
    expect(afterSave.value.getId().equals(id)).toBe(true);
  }

  await repository.delete(aggregate);
  const afterDelete = await repository.findById(id);
  expect(afterDelete.some).toBe(false);
}
