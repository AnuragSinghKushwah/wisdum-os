/**
 * Literal vocabularies of the Workspace bounded context. Value objects wrap
 * and validate these; the raw values appear in event payloads.
 */

export const WORKSPACE_STATUSES = ['active', 'archived', 'deleted'] as const;
export type WorkspaceStatusValue = (typeof WORKSPACE_STATUSES)[number];

/**
 * The member's standing inside the workspace. This is collaboration-level
 * access, distinct from Identity roles (which govern platform permissions).
 */
export const WORKSPACE_MEMBER_ROLES = ['owner', 'admin', 'member', 'guest'] as const;
export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

/** Setting values are JSON scalars; nested config belongs in dedicated models. */
export type WorkspaceSettingValue = string | number | boolean;
