-- Plugin aggregate: one installation in one tenant. The manifest fields are
-- flattened; capabilities/permissions are arrays, dependencies are structured JSON.
CREATE TABLE plugins (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants (id),
    name          text NOT NULL,
    version       text NOT NULL,
    display_name  text NOT NULL,
    description   text NOT NULL,
    capabilities  text[] NOT NULL DEFAULT '{}',
    permissions   text[] NOT NULL DEFAULT '{}',
    dependencies  jsonb NOT NULL DEFAULT '[]',
    status        text NOT NULL,
    installed_at  timestamptz NOT NULL,
    updated_at    timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX plugins_tenant_id_idx ON plugins (tenant_id);
CREATE INDEX plugins_capabilities_idx ON plugins USING gin (capabilities);
