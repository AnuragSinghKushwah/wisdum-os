-- AIModel aggregate: a specific model reference registered for a tenant, with
-- a completion or embedding capability profile (mutually exclusive by kind).
CREATE TABLE ai_models (
    id                     uuid PRIMARY KEY,
    tenant_id              uuid NOT NULL REFERENCES tenants (id),
    provider               text NOT NULL,
    model_name             text NOT NULL,
    kind                   text NOT NULL,
    context_window_tokens  integer,
    max_output_tokens      integer,
    supports_tools         boolean,
    embedding_dimensions   integer,
    embedding_max_input_tokens integer,
    enabled                boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL,
    updated_at             timestamptz NOT NULL,
    UNIQUE (tenant_id, provider, model_name)
);

CREATE INDEX ai_models_tenant_id_idx ON ai_models (tenant_id);
CREATE INDEX ai_models_tenant_kind_idx ON ai_models (tenant_id, kind);
