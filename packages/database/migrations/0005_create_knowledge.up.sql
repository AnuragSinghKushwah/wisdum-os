-- Knowledge aggregate: the canonical record of a knowledge asset. Content lives
-- behind content references (see knowledge_content_references), not inline here.
CREATE TABLE knowledge (
    id                     uuid PRIMARY KEY,
    tenant_id              uuid NOT NULL REFERENCES tenants (id),
    title                  text NOT NULL,
    slug                   text NOT NULL,
    description            text NOT NULL DEFAULT '',
    type                   text NOT NULL,
    status                 text NOT NULL,
    visibility             text NOT NULL,
    source_kind            text NOT NULL,
    source_uri             text,
    version                integer NOT NULL,
    properties             jsonb NOT NULL DEFAULT '{}',
    created_at             timestamptz NOT NULL,
    updated_at             timestamptz NOT NULL,
    processing_started_at  timestamptz,
    processed_at           timestamptz,
    UNIQUE (tenant_id, slug)
);

CREATE INDEX knowledge_tenant_id_idx ON knowledge (tenant_id);

CREATE TABLE knowledge_labels (
    knowledge_id uuid NOT NULL REFERENCES knowledge (id) ON DELETE CASCADE,
    label        text NOT NULL,
    PRIMARY KEY (knowledge_id, label)
);

CREATE TABLE knowledge_content_references (
    id            uuid PRIMARY KEY,
    knowledge_id  uuid NOT NULL REFERENCES knowledge (id) ON DELETE CASCADE,
    reference     text NOT NULL,
    mime_type     text,
    position      integer NOT NULL
);

CREATE INDEX knowledge_content_references_knowledge_id_idx
    ON knowledge_content_references (knowledge_id);
