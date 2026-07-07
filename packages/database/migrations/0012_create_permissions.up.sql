-- Permission aggregate: a registered `resource:action` grant, tenant-scoped.
CREATE TABLE permissions (
    id          uuid PRIMARY KEY,
    tenant_id   uuid NOT NULL REFERENCES tenants (id),
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL,
    UNIQUE (tenant_id, name)
);

CREATE INDEX permissions_tenant_id_idx ON permissions (tenant_id);
