-- Concept aggregate: a node in the knowledge graph (Product Bible §7, §15).
-- Deduplicated per tenant by normalized_name (ConceptRepository.findByName).
-- mention_count is the simplest "pattern" signal — no separate Pattern table.
CREATE TABLE concepts (
    id               uuid PRIMARY KEY,
    tenant_id        uuid NOT NULL REFERENCES tenants (id),
    name             text NOT NULL,
    normalized_name  text NOT NULL,
    description      text NOT NULL DEFAULT '',
    mention_count    integer NOT NULL DEFAULT 0,
    created_at       timestamptz NOT NULL,
    updated_at       timestamptz NOT NULL,
    UNIQUE (tenant_id, normalized_name)
);

CREATE INDEX concepts_tenant_id_idx ON concepts (tenant_id);
