-- User aggregate: identity attributes, credential reference, role assignments.
-- role_ids is a flat array here; Role/Permission tables land when the Identity
-- schema gets its own migration pass — this column only persists the relationship.
CREATE TABLE users (
    id            uuid PRIMARY KEY,
    tenant_id     uuid NOT NULL REFERENCES tenants (id),
    email         text NOT NULL,
    display_name  text NOT NULL,
    password_hash text,
    status        text NOT NULL,
    role_ids      uuid[] NOT NULL DEFAULT '{}',
    created_at    timestamptz NOT NULL,
    updated_at    timestamptz NOT NULL,
    UNIQUE (tenant_id, email)
);

CREATE INDEX users_tenant_id_idx ON users (tenant_id);
