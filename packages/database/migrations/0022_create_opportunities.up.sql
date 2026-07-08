-- Opportunity aggregate: the heart of Wisdum (Product Bible §8). Lifecycle
-- proposed -> drafted -> published, with dismissed as a terminal escape
-- hatch (see OpportunityStatus.canTransitionTo).
CREATE TABLE opportunities (
    id           uuid PRIMARY KEY,
    tenant_id    uuid NOT NULL REFERENCES tenants (id),
    insight_id   uuid NOT NULL REFERENCES insights (id),
    title        text NOT NULL,
    rationale    text NOT NULL,
    type         text NOT NULL,
    status       text NOT NULL,
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL
);

CREATE INDEX opportunities_tenant_id_idx ON opportunities (tenant_id);
CREATE INDEX opportunities_insight_id_idx ON opportunities (insight_id);
