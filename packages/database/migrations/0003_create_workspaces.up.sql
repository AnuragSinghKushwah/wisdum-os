-- Workspace aggregate: members, settings, limits, feature flags. No billing (that stays on Organization).
CREATE TABLE workspaces (
    id                     uuid PRIMARY KEY,
    tenant_id              uuid NOT NULL REFERENCES tenants (id),
    organization_id        uuid NOT NULL REFERENCES organizations (id),
    name                   text NOT NULL,
    slug                   text NOT NULL,
    status                 text NOT NULL,
    max_members            integer,
    max_knowledge_assets   integer,
    max_storage_bytes      bigint,
    created_at             timestamptz NOT NULL,
    updated_at             timestamptz NOT NULL,
    UNIQUE (tenant_id, slug)
);

CREATE INDEX workspaces_tenant_id_idx ON workspaces (tenant_id);
CREATE INDEX workspaces_organization_id_idx ON workspaces (organization_id);

-- A workspace always has at least one owner; enforced by the aggregate, not the schema.
CREATE TABLE workspace_members (
    workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id      uuid NOT NULL,
    role         text NOT NULL,
    joined_at    timestamptz NOT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE workspace_settings (
    workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    key          text NOT NULL,
    value        jsonb NOT NULL,
    PRIMARY KEY (workspace_id, key)
);

CREATE TABLE workspace_feature_flags (
    workspace_id uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    flag         text NOT NULL,
    enabled      boolean NOT NULL,
    PRIMARY KEY (workspace_id, flag)
);
