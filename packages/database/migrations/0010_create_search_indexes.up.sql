-- SearchIndex aggregate: index membership and ranking policy.
-- The physical index (Meilisearch, a vector store) lives outside Postgres;
-- this table is the domain's record of what should be in it.
CREATE TABLE search_indexes (
    id               uuid PRIMARY KEY,
    tenant_id        uuid NOT NULL REFERENCES tenants (id),
    name             text NOT NULL,
    mode             text NOT NULL,
    keyword_weight   numeric NOT NULL DEFAULT 0.5,
    semantic_weight  numeric NOT NULL DEFAULT 0.5,
    recency_weight   numeric NOT NULL DEFAULT 0,
    status           text NOT NULL,
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX search_indexes_tenant_id_idx ON search_indexes (tenant_id);

CREATE TABLE search_index_documents (
    search_index_id  uuid NOT NULL REFERENCES search_indexes (id) ON DELETE CASCADE,
    source_id        uuid NOT NULL,
    source_type      text NOT NULL,
    state            text NOT NULL,
    chunk_count      integer NOT NULL DEFAULT 0,
    indexed_at       timestamptz NOT NULL,
    PRIMARY KEY (search_index_id, source_id)
);
