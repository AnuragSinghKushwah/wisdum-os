import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `organizations` table. */
export interface OrganizationRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly subscription_plan: string;
  readonly subscription_external_ref: string;
  readonly subscription_state: string;
  readonly branding_logo_url: string | null;
  readonly branding_primary_color: string | null;
  readonly branding_accent_color: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `organization_policies` table. */
export interface OrganizationPolicyRow {
  readonly organization_id: UUID;
  readonly key: string;
  readonly value: unknown;
}

/** Raw row shape of the `organization_workspaces` table. */
export interface OrganizationWorkspaceRow {
  readonly organization_id: UUID;
  readonly workspace_id: UUID;
}
