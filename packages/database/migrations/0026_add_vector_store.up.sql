-- Backing store for `@wisdum/platform-search`'s VectorStore port (Product
-- Bible Search/Retrieval). No fixed dimension on `embedding`: exactly one
-- embedding provider is active per deployment (OpenAI or a local model, see
-- createEmbeddingProvider in apps/api), so the column tolerates whichever
-- dimensionality that provider produces rather than hard-coding one. No
-- ivfflat/hnsw index yet — those require a fixed dimension; brute-force
-- cosine scan is fine at this scale and is a documented follow-up.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_records (
    index_name  text NOT NULL,
    id          text NOT NULL,
    embedding   vector NOT NULL,
    metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (index_name, id)
);

CREATE INDEX vector_records_index_name_idx ON vector_records (index_name);
