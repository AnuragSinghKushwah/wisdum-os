# Domain: Search

> Implemented in [`packages/domain/src/search/`](../../packages/domain/src/search/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). How search is actually executed is recorded in [ADR 0010](../adr/0010-search-postgresql-full-text-and-pgvector.md).

## Purpose

Models named search indexes: which sources are indexed in each, in what state, and how the index blends keyword, semantic, and recency signals when ranking. The search engine itself (the text index and the vectors) lives in infrastructure; this context tracks membership and freshness, and defines the query and result shapes.

## Entities

**SearchIndex** (aggregate root) — identified by `SearchIndexId`, scoped to a tenant.

| State | Modelled as |
| --- | --- |
| `name` | Lowercase kebab-case, for example `knowledge-main`. Unique per tenant (a repository concern). |
| `mode` | `keyword`, `semantic`, or `hybrid`. |
| `ranking` | `SearchRanking`: keyword, semantic, and recency weights, each between 0 and 1 and summing to 1. |
| `status` | `active`, `rebuilding`, or `deleted`. |
| documents | `SearchDocument` records, one per indexed source: `sourceId`, `sourceType` (`knowledge`, `document`, `conversation`), `state` (`pending`, `indexed`, `failed`), and chunk count. |

Other value objects: `SearchQuery` (non-empty text up to a maximum length, a mode, filters, and a pagination window with `limit` from 1 to a maximum and a non-negative `offset`), `SearchResult` (a hit with a score normalized to 0 to 1), `ChunkReference` (document, chunk index, and a non-empty character span), and `EmbeddingReference` (chunk, model, dimensions, and vector key). Vectors never enter the domain.

### Lifecycle

```
active ◀──▶ rebuilding
   │
   └──▶ deleted (terminal)
```

`startRebuild()` moves an `active` index to `rebuilding` and empties its document membership; `completeRebuild()` returns it to `active` and reports the document count.

### Behaviors

`SearchIndex.create()`, `recordDocumentIndexed()`, `recordDocumentFailed()`, `removeDocument()`, `changeRanking()`, `startRebuild()`, `completeRebuild()`, `markDeleted()`, and the queries `documentCount()`, `containsSource()`, `isReady()`.

### Invariants

- The index name must be lowercase kebab-case.
- Ranking weights must be numbers between 0 and 1 that sum to 1.
- An index cannot start a rebuild while already rebuilding, and cannot complete one unless it is rebuilding.
- A deleted index cannot be modified.
- `SearchQuery` and `SearchResult` validate text length, mode, limit, offset, and score range at construction.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `search.index.created` | `SearchIndex.create()` |
| `search.index.rebuild-started` | `startRebuild()` |
| `search.index.rebuild-completed` | `completeRebuild()` |
| `search.index.ranking-changed` | `changeRanking()` |
| `search.index.deleted` | `markDeleted()` |
| `search.document.indexed` | `recordDocumentIndexed()` |
| `search.document.removed` | `removeDocument()` |
| `search.document.failed` | `recordDocumentFailed()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createSearchIndexCommand` and `indexSearchDocumentCommand`; queries `getSearchIndexQuery` and `searchIndexQuery`; the ports `SearchIndexReadModel`, `SearchIndexer`, and `SearchQueryExecutor`. In [`packages/application/src/search/`](../../packages/application/src/search/).

`IndexSearchDocumentHandler` first passes the text to the `SearchIndexer` port, which writes it to the search engine, then records the source in the aggregate and publishes the resulting event.

## Specifications

`SearchIndexIsReady`, `SearchIndexContainsSource` (takes a source id), `SearchIndexIsEmpty`, `SearchIndexHasFailures`.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/search-indexes` | Create an index. |
| `GET` | `/v1/search-indexes/:id` | Fetch an index. |
| `GET` | `/v1/search-indexes/:id/search` | Query one index (full-text over indexed documents). |
| `POST` | `/v1/search-indexes/:id/documents` | Index a document into the index. |
| `GET` | `/v1/search` | Tenant-wide search over knowledge, used by the web app (`q`, `mode`). It does not use a `SearchIndex`; see ADR 0010. |

Details: [docs/api/search.md](../api/search.md). Routes are in `apps/api/src/routes/search-routes.ts`.

## Persistence

`SearchIndexRepository` (`findById`, `findByName`, `findAll`, `save`, `delete`) has PostgreSQL and in-memory implementations. Tables owned by the aggregate: `search_indexes` and `search_index_documents` (migration `0010_create_search_indexes`). The engine's own storage is not part of the aggregate: `search_provider_documents` (migration 0017, the full-text index) and `vector_records` (migration 0026, the vectors).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. The context has no domain services.

## Open questions

- Only index creation, indexing a document, and querying are reachable through the API. `recordDocumentFailed`, `removeDocument`, `changeRanking`, `startRebuild`, `completeRebuild`, and `markDeleted` have no use case, so rebuilds, ranking changes, and deletion cannot be triggered, and a `failed` document state is never recorded.
- `ChunkReference` and `EmbeddingReference` are not used by any application or infrastructure code.
- The per-index `SearchRanking` weights are stored but do not influence any query; the tenant-wide route blends scores with fixed weights.
- `SearchIndex.status` is a plain string union rather than a value object with a transition map, unlike the other contexts.
