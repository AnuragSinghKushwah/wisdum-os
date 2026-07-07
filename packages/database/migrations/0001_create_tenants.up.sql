-- Tenants are the root of every scoping boundary in the platform.
-- Every other table carries a tenant_id and must filter by it.
CREATE TABLE tenants (
    id         uuid PRIMARY KEY,
    slug       text NOT NULL UNIQUE,
    name       text NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
