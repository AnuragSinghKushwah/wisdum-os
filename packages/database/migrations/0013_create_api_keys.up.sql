-- ApiKey aggregate: a credential issued to a user or service account.
CREATE TABLE api_keys (
    id         uuid PRIMARY KEY,
    tenant_id  uuid NOT NULL REFERENCES tenants (id),
    owner_id   uuid NOT NULL,
    owner_type text NOT NULL,
    label      text NOT NULL,
    key_hash   text NOT NULL UNIQUE,
    scopes     text[] NOT NULL DEFAULT '{}',
    status     text NOT NULL,
    expires_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE INDEX api_keys_tenant_id_idx ON api_keys (tenant_id);
CREATE INDEX api_keys_owner_idx ON api_keys (owner_id, owner_type);
