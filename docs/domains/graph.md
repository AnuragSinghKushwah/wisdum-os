# Domain: Graph

> Implemented in [`packages/domain/src/graph/`](../../packages/domain/src/graph/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

The knowledge graph: the distinct ideas ("concepts") found across a tenant's knowledge, which knowledge assets mention them, and how concepts relate to each other. It is the "Connect" step of the core loop. The context models the graph's nodes and edges; building the graph is the job of the reasoning pass in the application layer.

## Entities

Three small aggregate roots, each scoped to a tenant.

| Aggregate | Meaning | Key state |
| --- | --- | --- |
| **Concept** | A node: a distinct idea or topic. | `ConceptName` (deduplicated per tenant on a normalized form, so "Redis Scaling" and "redis scaling" are one node), optional `ConceptDescription`, `mentionCount`. |
| **ConceptMention** | An edge from a knowledge asset to a concept it mentions. | `conceptId`, `knowledgeId` (a plain id; the graph does not import the Knowledge context). |
| **ConceptRelationship** | An edge between two concepts. | `conceptAId`, `conceptBId`, `ConceptRelationshipType`, `occurrenceCount`. |

`ConceptRelationshipType` is fixed at creation and is one of `co_occurs`, `relates_to`, `depends_on`, `extends`, `contradicts`, `complements`, `implemented_by`.

### Behaviors

- `Concept.recordMention()` increments `mentionCount`.
- `ConceptRelationship.recordOccurrence()` increments `occurrenceCount` when the same pair is seen again.
- Mentions have no behavior beyond being created.

### Invariants

- Value objects validate themselves: ids must be UUIDs, a concept name is non-empty and length-limited, a description is length-limited, and a relationship type must be one of the listed values.
- The aggregates enforce no cross-field rules. Nothing in the domain prevents a relationship from linking a concept to itself or recording a duplicate pair; uniqueness is maintained by the reasoning pass, which looks up `findExisting` before creating.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `graph.concept.created` | `Concept.create()` |
| `graph.concept.mentioned` | `ConceptMention.create()` |
| `graph.concept-relationship.detected` | `ConceptRelationship.create()` |

`recordMention()` and `recordOccurrence()` raise no events.

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Read side only, in [`packages/application/src/graph/`](../../packages/application/src/graph/): `getGraphTopologyQuery` and `getGraphNeighborsQuery`, served through the `GraphReadModel` port. The write side lives in the reasoning context: `RunReasoningPassHandler` finds or creates concepts (`findByName`), records mentions only once per concept and asset (`findExisting`), and creates or reinforces relationships.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/v1/graph` | Full topology (nodes and edges) for the tenant. |
| `GET` | `/v1/graph/neighbors` | Concepts adjacent to `conceptId` (required); accepts `depth`. |
| `GET` | `/v1/graph/concepts` | List concepts. |
| `GET` | `/v1/graph/relationships` | List relationships. |

[docs/api/graph.md](../api/graph.md) documents the last two. Routes are in `apps/api/src/routes/graph-routes.ts`.

## Persistence

Three repository ports, each with `findById`, `save`, and `delete`: `ConceptRepository` (`findByName`, `listByTenant`), `ConceptMentionRepository` (`findExisting`, `listByConcept`), and `ConceptRelationshipRepository` (`findExisting`, `listByTenant`). Tables: `concepts`, `concept_mentions`, `concept_relationships` (migrations 0018 to 0020).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. The context has no specifications or domain services.

## Open questions

- **`depth` is ignored.** The neighbors route parses `depth`, but the PostgreSQL read model always returns the immediate neighbors of `conceptId`.
- **The in-memory fallback ignores `conceptId`.** Without a database, the read model defined in `apps/api/src/container/modules/graph-module.ts` answers `getNeighbors` with the whole topology.
- `docs/api/graph.md` does not yet document `GET /v1/graph` or `GET /v1/graph/neighbors`.
- No domain rule rejects a self-referencing relationship or a duplicate pair; the reasoning pass is the only guard.
