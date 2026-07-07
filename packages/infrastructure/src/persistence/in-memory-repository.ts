import type { AggregateRoot, Identifier, Repository } from '@wisdum/domain';
import type { Option } from '@wisdum/types';
import { none, some } from '@wisdum/types';

/**
 * Base for in-memory repository adapters used in development and tests.
 * Concrete repositories extend this for the base CRUD operations and add
 * their own finder methods over `values()`. No business logic — storage
 * and lookup only.
 */
export abstract class InMemoryRepository<
  TId extends Identifier<string>,
  TAggregate extends AggregateRoot<TId>,
> implements Repository<TAggregate> {
  private readonly store = new Map<string, TAggregate>();

  save(aggregate: TAggregate): Promise<void> {
    this.store.set(aggregate.getId().toString(), aggregate);
    return Promise.resolve();
  }

  findById(id: TId): Promise<Option<TAggregate>> {
    const found = this.store.get(id.toString());
    return Promise.resolve(found === undefined ? none : some(found));
  }

  delete(aggregate: TAggregate): Promise<void> {
    this.store.delete(aggregate.getId().toString());
    return Promise.resolve();
  }

  exists(id: TId): Promise<boolean> {
    return Promise.resolve(this.store.has(id.toString()));
  }

  protected values(): readonly TAggregate[] {
    return [...this.store.values()];
  }

  /** Enumerate every stored aggregate. Read-model adapters use this to build projections. */
  all(): readonly TAggregate[] {
    return this.values();
  }
}
