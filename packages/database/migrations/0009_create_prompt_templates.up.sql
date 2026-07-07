-- PromptTemplate aggregate: a versioned, reusable prompt body.
-- Every body change bumps revision (see PromptTemplate.updateBody).
CREATE TABLE prompt_templates (
    id           uuid PRIMARY KEY,
    tenant_id    uuid NOT NULL REFERENCES tenants (id),
    name         text NOT NULL,
    description  text NOT NULL DEFAULT '',
    body         text NOT NULL,
    variables    text[] NOT NULL DEFAULT '{}',
    revision     integer NOT NULL,
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX prompt_templates_tenant_id_idx ON prompt_templates (tenant_id);
