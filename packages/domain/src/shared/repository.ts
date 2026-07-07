import type { Identifier } from './identifier.js';
import type { AggregateRoot } from './aggregate-root.js';
import type { Option } from '@wisdum/types';

/**
 * Generic repository interface. Concrete repositories (e.g., UserRepository,
 * DocumentRepository) extend this and add domain-specific finder methods.
 *
 * This package defines the interface only; implementations live in the
 * application/infrastructure layer, never in the domain.
 */
export interface Repository<TAggregate extends AggregateRoot<Identifier<string>>> {
  /** Save an aggregate (insert or update). */
  save(aggregate: TAggregate): Promise<void>;

  /** Retrieve an aggregate by its identifier, or none if not found. */
  findById(id: Identifier<string>): Promise<Option<TAggregate>>;

  /** Delete an aggregate. */
  delete(aggregate: TAggregate): Promise<void>;
}
