-- Role aggregate: a named, tenant-scoped bundle of permissions.
CREATE TABLE roles (
    id          uuid PRIMARY KEY,
    tenant_id   uuid NOT NULL REFERENCES tenants (id),
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_system   boolean NOT NULL DEFAULT false,
    permissions text[] NOT NULL DEFAULT '{}',
    created_at  timestamptz NOT NULL,
    updated_at  timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX roles_tenant_id_idx ON roles (tenant_id);
