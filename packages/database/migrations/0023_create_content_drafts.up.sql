-- ContentDraft aggregate: the Content Engine's output (Product Bible §9).
-- One draft per opportunity for this POC.
CREATE TABLE content_drafts (
    id              uuid PRIMARY KEY,
    tenant_id       uuid NOT NULL REFERENCES tenants (id),
    opportunity_id  uuid NOT NULL REFERENCES opportunities (id),
    title           text NOT NULL,
    body            text NOT NULL DEFAULT '',
    status          text NOT NULL,
    created_at      timestamptz NOT NULL,
    updated_at      timestamptz NOT NULL,
    UNIQUE (opportunity_id)
);

CREATE INDEX content_drafts_tenant_id_idx ON content_drafts (tenant_id);
