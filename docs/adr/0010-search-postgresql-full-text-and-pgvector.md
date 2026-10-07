# 0010 — Search on PostgreSQL full-text and pgvector

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Keyword search implemented in `862a9d6`; vector search in `54496c1`. Rationale is reconstructed from the code and history.
- **Supersedes:** [ADR 0003](0003-core-technology-stack.md) (full-text search row only)

## Context

[ADR 0003](0003-core-technology-stack.md) named Meilisearch as the default full-text engine behind a search-provider abstraction. The platform also needs semantic search over embeddings, and the project's self-hosting principle favors fewer moving parts. Meilisearch has not been implemented: the only trace of it in code is a mention in a port comment.

## Decision

Search runs on the existing PostgreSQL database, behind the provider abstractions:

- **Index-scoped full-text search.** The `search_provider_documents` table has a generated `tsvector` column (`to_tsvector('english', content)`) with a GIN index. `PostgresSearchProvider` implements the `SearchProvider` port using `websearch_to_tsquery('english', …)` and `ts_rank`, clamped to `[0, 1]`. It serves `GET /v1/search-indexes/:id/search`, through `ProviderSearchQueryExecutor`, over documents added with `POST /v1/search-indexes/:id/documents`.
- **Semantic search.** The `vector_records` table uses the pgvector extension; `PostgresVectorStore` ranks by cosine distance (`<=>`). Text is split by a fixed-size chunker and embedded by an `EmbeddingProvider`: OpenAI when `OPENAI_API_KEY` is set, otherwise a local in-process model (`Xenova/all-MiniLM-L6-v2`, 384 dimensions, via `@xenova/transformers`) so a self-hosted deployment needs no vendor key. The local model loads lazily on first use.
- **Tenant-wide search.** `GET /v1/search?q=…&mode=keyword|semantic|hybrid`, used by the web search page, is implemented directly in the route. Keyword mode is a case-insensitive substring match on the knowledge title (`title ILIKE`). Semantic mode embeds the query and queries the vector index `knowledge:<tenantId>` for ten hits. Hybrid mode multiplies each semantic score by 0.7 and adds 0.3 for keyword matches. If the semantic path fails, the route falls back to keyword mode.
- **Unused ranking code.** `platform/search` also contains `WeightedHybridSearch`, `HybridRetriever`, and a weighted ranking engine built on the domain `SearchRanking` value object, but nothing outside that package and its tests uses them.
- **No database configured.** Without `DATABASE_URL`, in-memory search and vector stores are used.
- **Meilisearch stays possible**, because retrievers and providers sit behind ports, but is not part of the platform today.

## Consequences

- One datastore to operate, back up, and secure; search state is transactionally close to the data it indexes.
- **Two keyword implementations.** The index-scoped route uses real full-text search over document content; the tenant-wide route that the web app calls matches titles only, cannot use an index for a leading-wildcard `ILIKE`, and does not escape `%` or `_` in the user's text. Content that is not in the title is findable only through the semantic path.
- **The fixed 0.7/0.3 blend is not configurable** and bypasses the per-index `SearchRanking` weights the domain models.
- **The language is fixed to English.** The `'english'` text-search configuration is hard-coded, so non-English content stems and ranks poorly.
- **Vector search is a sequential scan.** The `embedding` column deliberately has no declared dimension, because exactly one embedding provider is active per deployment, and so there is no ANN index (HNSW or IVFFlat), which requires a fixed dimension. The migration records brute-force cosine scan as acceptable at current scale and the index as a follow-up. That does not meet the project's stated target of millions of assets, so a fixed dimension per model plus an ANN index needs its own decision.
- Because the dimension is not enforced, changing the embedding provider on an existing deployment leaves vectors of a different size in the same table; existing content must be re-embedded.
- Deployments need a PostgreSQL image with pgvector. The first local-embedding call downloads a model, which takes seconds and needs network access.

## Alternatives considered

- **Meilisearch (the ADR 0003 default).** Not taken: it adds a service to deploy and a second source of truth to keep in sync. It remains available through the provider port.
- **A dedicated vector database.** Not taken for the same operational reason; revisit if the pgvector scan becomes the bottleneck.
