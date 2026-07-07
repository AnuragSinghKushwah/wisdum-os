-- ServiceAccount aggregate: a non-human identity that can hold roles and API keys.
CREATE TABLE service_accounts (
    id           uuid PRIMARY KEY,
    tenant_id    uuid NOT NULL REFERENCES tenants (id),
    display_name text NOT NULL,
    description  text NOT NULL DEFAULT '',
    status       text NOT NULL,
    role_ids     uuid[] NOT NULL DEFAULT '{}',
    created_at   timestamptz NOT NULL,
    updated_at   timestamptz NOT NULL
);

CREATE INDEX service_accounts_tenant_id_idx ON service_accounts (tenant_id);
