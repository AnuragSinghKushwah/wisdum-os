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

| Context | Scope | Status |
| --- | --- | --- |
| `knowledge/` | Knowledge assets: aggregate, value objects, events, ports ([docs](../../docs/domains/knowledge.md)) | **Modelled** |
| `identity/` | Actors on the platform and their tenant memberships | Placeholder |
| `workspace/` | Tenant workspaces — the container for knowledge work | Placeholder |
| `plugin/` | Registered plugins and their lifecycle state | Placeholder |
| `ai/` | AI-assisted workflows and their execution state | Placeholder |
| `search/` | Search indexing state and query orchestration | Placeholder |

Each remaining context ships with its design doc in `docs/domains/` before implementation lands.

## Boundaries

- Contexts never import from each other — they communicate through `@wisdum/events`.
- No I/O, no framework types, no provider SDKs.
- No dependency on persistence, HTTP, or authentication.
