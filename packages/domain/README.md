# @wisdum/domain

Home of the platform's bounded contexts and tactical DDD primitives. Business logic resides here (never in apps).

## Tactical DDD primitives

Every bounded context builds on `shared/`, which provides:

| Type | Purpose |
| --- | --- |
| `Identifier<TBrand>` | Strongly typed, immutable aggregate identifiers |
| `Entity<TId>` | Entities with persistent identity and identity equality |
| `ValueObject<T>` | Immutable value objects with structural equality |
| `AggregateRoot<TId>` | Entities that maintain consistency boundaries and domain events |
| `DomainEvent<T>` | Immutable facts about what happened in the domain |
| `Repository<TAggregate>` | Interface for aggregate persistence (implementation elsewhere) |
| `DomainService` | Marker for stateless services coordinating between aggregates |
| `Specification<T>` | Encapsulated domain rules and composable queries |
| `Clock` and `SystemClock` | Abstracted time (domain never calls `Date` directly) |

See [ADR 0007](../../docs/adr/0007-domain-driven-design.md) for the DDD philosophy.

## Bounded contexts

| Context | Scope |
| --- | --- |
| `identity/` | Actors on the platform and their tenant memberships |
| `workspace/` | Tenant workspaces — the container for knowledge work |
| `knowledge/` | Knowledge assets and the connections between them |
| `plugin/` | Registered plugins and their lifecycle state |
| `ai/` | AI-assisted workflows and their execution state |
| `search/` | Search indexing state and query orchestration |

Currently placeholder exports only — each context ships with its own ADR and design doc in `docs/domains/` before implementation lands.

## Boundaries

- Contexts never import from each other — they communicate through `@wisdum/events`.
- No I/O, no framework types, no provider SDKs.
- No dependency on persistence, HTTP, or authentication.
