-- Organization aggregate: workspaces, subscription reference, branding, policies.
-- Slugs are unique platform-wide (not tenant-scoped), matching OrganizationRepository.findBySlug.
CREATE TABLE organizations (
    id                          uuid PRIMARY KEY,
    tenant_id                   uuid NOT NULL REFERENCES tenants (id),
    name                        text NOT NULL,
    slug                        text NOT NULL UNIQUE,
    status                      text NOT NULL,
    subscription_plan          text NOT NULL,
    subscription_external_ref  text NOT NULL,
    subscription_state         text NOT NULL,
    branding_logo_url          text,
    branding_primary_color     text,
    branding_accent_color      text,
    created_at                  timestamptz NOT NULL,
    updated_at                  timestamptz NOT NULL
);

CREATE INDEX organizations_tenant_id_idx ON organizations (tenant_id);

-- Governance policies handed down to every workspace, keyed per organization.
CREATE TABLE organization_policies (
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    key             text NOT NULL,
    value           jsonb NOT NULL,
    PRIMARY KEY (organization_id, key)
);

-- Workspaces attached to an organization (inverse side of Organization.workspaceIds).
CREATE TABLE organization_workspaces (
    organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    workspace_id    uuid NOT NULL,
    PRIMARY KEY (organization_id, workspace_id)
);
