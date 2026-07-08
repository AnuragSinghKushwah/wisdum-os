-- Denormalized text backing the SearchProvider port (index/remove/query):
-- the SearchIndex aggregate tracks only membership and freshness of what
-- should be indexed (see 0010_create_search_indexes); the actual searchable
-- text lives here, keyed by the same (index_name, document_id) pair the
-- provider port already uses, with a generated tsvector column doing the
-- full-text matching.
CREATE TABLE search_provider_documents (
    index_name    text NOT NULL,
    document_id   text NOT NULL,
    content       text NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (index_name, document_id)
);

CREATE INDEX search_provider_documents_vector_idx ON search_provider_documents USING GIN (search_vector);
