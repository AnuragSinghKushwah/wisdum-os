-- PublishedContent aggregate: the Publishing Engine's output for this POC
-- (Product Bible §10) plus view_count for the Measure step (§11). The
-- public route serves this by id, not slug, so no tenant context is
-- required to resolve it; slug stays unique per tenant for future vanity
-- URLs.
CREATE TABLE published_content (
    id              uuid PRIMARY KEY,
    tenant_id       uuid NOT NULL REFERENCES tenants (id),
    draft_id        uuid NOT NULL REFERENCES content_drafts (id),
    opportunity_id  uuid NOT NULL REFERENCES opportunities (id),
    slug            text NOT NULL,
    title           text NOT NULL,
    body            text NOT NULL DEFAULT '',
    view_count      integer NOT NULL DEFAULT 0,
    published_at    timestamptz NOT NULL,
    UNIQUE (tenant_id, slug)
);

CREATE INDEX published_content_tenant_id_idx ON published_content (tenant_id);
