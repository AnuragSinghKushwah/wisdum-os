-- Document aggregate: raw content, mime type, language, encoding, size, hash.
-- Content-hash dedup is scoped per tenant (DocumentRepository.findByContentHash).
CREATE TABLE documents (
    id                      uuid PRIMARY KEY,
    tenant_id               uuid NOT NULL REFERENCES tenants (id),
    content                 text NOT NULL,
    mime_type               text NOT NULL,
    language                text NOT NULL,
    encoding                text NOT NULL,
    size_bytes              bigint NOT NULL,
    content_hash_algorithm  text NOT NULL,
    content_hash_digest     text NOT NULL,
    status                  text NOT NULL,
    created_at              timestamptz NOT NULL,
    updated_at              timestamptz NOT NULL,
    UNIQUE (tenant_id, content_hash_algorithm, content_hash_digest)
);

CREATE INDEX documents_tenant_id_idx ON documents (tenant_id);
