-- AIProvider aggregate: a tenant's registration of an upstream AI vendor.
CREATE TABLE ai_providers (
    id           uuid PRIMARY KEY,
    tenant_id    uuid NOT NULL REFERENCES tenants (id),
    name         text NOT NULL,
    display_name text NOT NULL,
    enabled      boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX ai_providers_tenant_id_idx ON ai_providers (tenant_id);
