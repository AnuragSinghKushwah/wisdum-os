-- ConceptRelationship aggregate: a Concept <-> Concept edge. occurrence_count
-- crossing a threshold is the "Pattern" signal the reasoning pipeline acts
-- on (Product Bible §7). The pipeline always orders (concept_a_id,
-- concept_b_id) canonically before upserting, so an unordered pair is
-- never stored twice.
CREATE TABLE concept_relationships (
    id                 uuid PRIMARY KEY,
    tenant_id          uuid NOT NULL REFERENCES tenants (id),
    concept_a_id       uuid NOT NULL REFERENCES concepts (id),
    concept_b_id       uuid NOT NULL REFERENCES concepts (id),
    relationship_type  text NOT NULL,
    occurrence_count   integer NOT NULL DEFAULT 1,
    created_at         timestamptz NOT NULL,
    updated_at         timestamptz NOT NULL,
    CHECK (concept_a_id <> concept_b_id),
    UNIQUE (tenant_id, concept_a_id, concept_b_id, relationship_type)
);

CREATE INDEX concept_relationships_tenant_id_idx ON concept_relationships (tenant_id);
