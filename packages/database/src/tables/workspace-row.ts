import type { IsoTimestamp, UUID } from '@wisdum/types';

/** Raw row shape of the `workspaces` table. */
export interface WorkspaceRow {
  readonly id: UUID;
  readonly tenant_id: UUID;
  readonly organization_id: UUID;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly max_members: number | null;
  readonly max_knowledge_assets: number | null;
  /** `bigint` in Postgres — the `pg` driver returns it as a string. */
  readonly max_storage_bytes: string | null;
  readonly created_at: IsoTimestamp;
  readonly updated_at: IsoTimestamp;
}

/** Raw row shape of the `workspace_members` table. */
export interface WorkspaceMemberRow {
  readonly workspace_id: UUID;
  readonly user_id: UUID;
  readonly role: string;
  readonly joined_at: IsoTimestamp;
}

/** Raw row shape of the `workspace_settings` table. */
export interface WorkspaceSettingRow {
  readonly workspace_id: UUID;
  readonly key: string;
  readonly value: unknown;
}

/** Raw row shape of the `workspace_feature_flags` table. */
export interface WorkspaceFeatureFlagRow {
  readonly workspace_id: UUID;
  readonly flag: string;
  readonly enabled: boolean;
}
