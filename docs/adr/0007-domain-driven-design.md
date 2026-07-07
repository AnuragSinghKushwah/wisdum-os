# 0007 — Domain-Driven Design

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

Wisdum is a Knowledge Operations Platform. Its architecture (ADR 0002) is domain-driven: decomposed into self-contained bounded contexts that communicate through events. This ADR formalizes what "domain-driven" means for the project and establishes the tactical patterns every bounded context must follow.

## Decision

Wisdum adopts Eric Evans' Domain-Driven Design as its design philosophy. Every bounded context (domain in `packages/domain/src/{identity,workspace,knowledge,...}`) follows these patterns:

### Ubiquitous Language

Each bounded context defines a vocabulary of domain concepts (`Entity`, `ValueObject`, `AggregateRoot`, `DomainEvent`) in code. This vocabulary is shared with domain experts, product, and operations — it's not just for engineers.

### Entities and Identity

An **Entity** has a persistent, immutable identity that distinguishes it from other entities regardless of their attributes. Entities can have mutable state; their identity is what persists.

Entities are generic over their identifier type, preventing accidental ID mixing across domains:

```typescript
abstract class UserEntity extends Entity<UserId> { }
```

### Value Objects

A **ValueObject** has no identity; equality is structural. Two value objects with the same attributes are equal. ValueObjects are immutable — operations return new instances.

```typescript
abstract class Email extends ValueObject<Email> {
  abstract equals(other: unknown): boolean;
}
```

### Aggregates and Aggregate Roots

An **Aggregate** is a cluster of entities and value objects that must remain consistent as a unit. The Aggregate Root is the entry point to the aggregate; external code references the aggregate only through its root.

Each aggregate has one identifier (the root's). Operations on the aggregate either succeed atomically or fail entirely. Invariants are checked at the aggregate boundary.

```typescript
abstract class UserAggregate extends AggregateRoot<UserId> {
  // ...
  changeName(newName: Name): void {
    // Enforce invariants
    if (newName.isEmpty()) throw new InvariantViolationError(...);
    this.name = newName;
    this.addDomainEvent(...);
  }
}
```

### Domain Events

A **DomainEvent** is a fact: something that happened in the domain. Aggregates publish events when their state changes. Events are immutable and timestamped and carry enough information that other aggregates can react.

```typescript
interface UserCreatedEvent extends DomainEvent {
  readonly payload: {
    readonly userId: UserId;
    readonly email: Email;
  };
}
```

Domain events are the only way aggregates communicate; direct imports between aggregates are forbidden.

### Repositories

A **Repository** persists and retrieves aggregates. The repository interface is defined in the domain; implementations live in the application layer (never in the domain package itself).

```typescript
interface UserRepository extends Repository<UserAggregate> {
  findByEmail(email: Email): Promise<Option<UserAggregate>>;
}
```

Repositories are not created by bounded contexts that need them; they are injected by the application layer.

### Domain Services

A **DomainService** encapsulates domain logic that doesn't belong to a single aggregate or entity — logic that coordinates between aggregates, checks cross-aggregate invariants, or orchestrates complex workflows.

```typescript
interface TransferService extends DomainService {
  transferDocumentOwnership(
    documentId: DocumentId,
    fromUserId: UserId,
    toUserId: UserId,
  ): Promise<void>;
}
```

Domain services are stateless and have stable, documented contracts.

### Specifications

A **Specification** encapsulates a domain rule or query in a composable object. Specifications are not queries or filters; they express domain criteria.

```typescript
const activeUsers = users.filter((u) =>
  new UserIsActiveSpecification().and(new UserHasVerifiedEmailSpecification()).isSatisfiedBy(u)
);
```

## Why persistence is outside the domain

The domain defines what repositories look like; repositories exist to serve the domain. The domain does not depend on a database, ORM, or HTTP client.

This inversion keeps the domain portable: the same aggregate can be persisted to PostgreSQL, event-sourced, or kept in memory for testing without any domain code changing.

Persistence mechanics (SQL, migrations, indexes, caching strategies) are application-layer concerns, not domain concerns. The domain is the specification of behavior; persistence is the implementation detail.

## Consequences

- **Domains are portable.** The same aggregate runs against PostgreSQL, an in-memory store, or a test double with identical behavior.
- **Testing is straightforward.** No mocking of external systems in domain tests; aggregates are plain objects.
- **The ubiquitous language is preserved in code.** Domain experts can read and critique logic without filter translation.
- **Bounded contexts are autonomous.** Changes to one context don't leak into another through shared code; only events propagate.
- **Tactical packages (domain/src/shared) are mandatory.** Every bounded context uses Entity, ValueObject, AggregateRoot, etc. — no ad-hoc patterns allowed.

## Alternatives considered

- **Anemic domain model (CRUD services only).** Rejected: business logic lives in service layers, not in entities; the domain becomes an ORM-driven schema description, losing the ability to express invariants or reason about correctness.
- **No aggregates; fine-grained entities.** Rejected: distributed transactions become necessary; performance and reasoning both suffer.
- **Repositories return domain objects to the application layer and let the layer modify them freely.** Rejected: invariants are lost; business rules leak out; the domain stops being a specification.
