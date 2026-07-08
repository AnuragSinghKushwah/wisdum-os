-- Insight aggregate: a reasoning conclusion (Product Bible §7, "Reason ->
-- Insight"), referencing the concepts and source knowledge assets it was
-- derived from by primitive id (no FK — these cross bounded contexts).
-- Immutable once generated.
CREATE TABLE insights (
    id                     uuid PRIMARY KEY,
    tenant_id              uuid NOT NULL REFERENCES tenants (id),
    summary                text NOT NULL,
    concept_ids            uuid[] NOT NULL DEFAULT '{}',
    source_knowledge_ids   uuid[] NOT NULL DEFAULT '{}',
    created_at             timestamptz NOT NULL
);

CREATE INDEX insights_tenant_id_idx ON insights (tenant_id);
