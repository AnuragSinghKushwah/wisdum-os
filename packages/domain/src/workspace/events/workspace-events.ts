import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type {
  WorkspaceMemberRole,
  WorkspaceSettingValue,
  WorkspaceStatusValue,
} from '../types/workspace-types.js';

/**
 * Domain events of the Workspace bounded context. Event types follow the
 * platform convention `[domain].[entity].[action]`; payloads carry domain
 * data only, as primitives, so consumers never depend on value object classes.
 */

export const WORKSPACE_EVENT_SCHEMA_VERSION = 1;

export const WORKSPACE_CREATED = 'workspace.workspace.created';
export const WORKSPACE_RENAMED = 'workspace.workspace.renamed';
export const WORKSPACE_ARCHIVED = 'workspace.workspace.archived';
export const WORKSPACE_RESTORED = 'workspace.workspace.restored';
export const WORKSPACE_DELETED = 'workspace.workspace.deleted';
export const WORKSPACE_MEMBER_ADDED = 'workspace.member.added';
export const WORKSPACE_MEMBER_REMOVED = 'workspace.member.removed';
export const WORKSPACE_MEMBER_ROLE_CHANGED = 'workspace.member.role-changed';
export const WORKSPACE_SETTING_CHANGED = 'workspace.settings.changed';
export const WORKSPACE_LIMITS_CHANGED = 'workspace.limits.changed';
export const WORKSPACE_FEATURE_FLAG_TOGGLED = 'workspace.feature-flag.toggled';

type WorkspaceEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface WorkspaceCreatedPayload {
  readonly workspaceId: UUID;
  readonly organizationId: UUID;
  readonly name: string;
  readonly slug: string;
}
export type WorkspaceCreated = WorkspaceEvent<typeof WORKSPACE_CREATED, WorkspaceCreatedPayload>;

export interface WorkspaceRenamedPayload {
  readonly workspaceId: UUID;
  readonly from: string;
  readonly to: string;
}
export type WorkspaceRenamed = WorkspaceEvent<typeof WORKSPACE_RENAMED, WorkspaceRenamedPayload>;

export interface WorkspaceArchivedPayload {
  readonly workspaceId: UUID;
}
export type WorkspaceArchived = WorkspaceEvent<typeof WORKSPACE_ARCHIVED, WorkspaceArchivedPayload>;

export interface WorkspaceRestoredPayload {
  readonly workspaceId: UUID;
}
export type WorkspaceRestored = WorkspaceEvent<typeof WORKSPACE_RESTORED, WorkspaceRestoredPayload>;

export interface WorkspaceDeletedPayload {
  readonly workspaceId: UUID;
  readonly previousStatus: WorkspaceStatusValue;
}
export type WorkspaceDeleted = WorkspaceEvent<typeof WORKSPACE_DELETED, WorkspaceDeletedPayload>;

export interface WorkspaceMemberAddedPayload {
  readonly workspaceId: UUID;
  readonly userId: UUID;
  readonly role: WorkspaceMemberRole;
}
export type WorkspaceMemberAdded = WorkspaceEvent<
  typeof WORKSPACE_MEMBER_ADDED,
  WorkspaceMemberAddedPayload
>;

export interface WorkspaceMemberRemovedPayload {
  readonly workspaceId: UUID;
  readonly userId: UUID;
}
export type WorkspaceMemberRemoved = WorkspaceEvent<
  typeof WORKSPACE_MEMBER_REMOVED,
  WorkspaceMemberRemovedPayload
>;

export interface WorkspaceMemberRoleChangedPayload {
  readonly workspaceId: UUID;
  readonly userId: UUID;
  readonly from: WorkspaceMemberRole;
  readonly to: WorkspaceMemberRole;
}
export type WorkspaceMemberRoleChanged = WorkspaceEvent<
  typeof WORKSPACE_MEMBER_ROLE_CHANGED,
  WorkspaceMemberRoleChangedPayload
>;

export interface WorkspaceSettingChangedPayload {
  readonly workspaceId: UUID;
  readonly key: string;
  readonly value: WorkspaceSettingValue | null;
}
export type WorkspaceSettingChanged = WorkspaceEvent<
  typeof WORKSPACE_SETTING_CHANGED,
  WorkspaceSettingChangedPayload
>;

export interface WorkspaceLimitsChangedPayload {
  readonly workspaceId: UUID;
  readonly maxMembers: number | null;
  readonly maxKnowledgeAssets: number | null;
  readonly maxStorageBytes: number | null;
}
export type WorkspaceLimitsChanged = WorkspaceEvent<
  typeof WORKSPACE_LIMITS_CHANGED,
  WorkspaceLimitsChangedPayload
>;

export interface WorkspaceFeatureFlagToggledPayload {
  readonly workspaceId: UUID;
  readonly flag: string;
  readonly enabled: boolean;
}
export type WorkspaceFeatureFlagToggled = WorkspaceEvent<
  typeof WORKSPACE_FEATURE_FLAG_TOGGLED,
  WorkspaceFeatureFlagToggledPayload
>;

export type AnyWorkspaceEvent =
  | WorkspaceCreated
  | WorkspaceRenamed
  | WorkspaceArchived
  | WorkspaceRestored
  | WorkspaceDeleted
  | WorkspaceMemberAdded
  | WorkspaceMemberRemoved
  | WorkspaceMemberRoleChanged
  | WorkspaceSettingChanged
  | WorkspaceLimitsChanged
  | WorkspaceFeatureFlagToggled;
