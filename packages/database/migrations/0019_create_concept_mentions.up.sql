-- ConceptMention aggregate: a Knowledge -> Concept edge (the "Connect" step
-- of the Core Loop, Product Bible §5). knowledge_id references the
-- knowledge table but has no FK constraint here — Knowledge and graph are
-- separate bounded contexts (see packages/domain/src/graph).
CREATE TABLE concept_mentions (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants (id),
    concept_id    uuid NOT NULL REFERENCES concepts (id),
    knowledge_id  uuid NOT NULL,
    created_at    timestamptz NOT NULL,
    UNIQUE (concept_id, knowledge_id)
);

CREATE INDEX concept_mentions_tenant_id_idx ON concept_mentions (tenant_id);
CREATE INDEX concept_mentions_knowledge_id_idx ON concept_mentions (knowledge_id);
