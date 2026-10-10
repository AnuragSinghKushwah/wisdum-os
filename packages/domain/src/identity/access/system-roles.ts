import { catalogResources } from './permission-catalog.js';
import type { CatalogPermission } from './permission-catalog.js';

/** Roles every tenant has. Their permissions are defined here, not stored. */
export const SYSTEM_ROLE_NAMES = ['owner', 'admin', 'member', 'viewer'] as const;

export type SystemRoleName = (typeof SYSTEM_ROLE_NAMES)[number];

export function isSystemRoleName(value: string): value is SystemRoleName {
  return (SYSTEM_ROLE_NAMES as readonly string[]).includes(value);
}

function everythingOn(resources: readonly string[]): string[] {
  return resources.map((resource) => `${resource}:*`);
}

/** Read-only access to workspace content. Sensitive resources (users, API keys) are deliberately absent. */
const VIEWER: readonly CatalogPermission[] = [
  'agent:read',
  'conversation:read',
  'dashboard:read',
  'document:read',
  'draft:read',
  'event:read',
  'graph:read',
  'knowledge:read',
  'opportunity:read',
  'organization:read',
  'plugin:read',
  'search:read',
  'workspace:read',
];

/** Everyday contributors: can create and edit content and run analysis, but not publish or administer. */
const MEMBER: readonly CatalogPermission[] = [
  ...VIEWER,
  'agent:run',
  'conversation:write',
  'document:write',
  'draft:write',
  'knowledge:write',
  'opportunity:write',
  'reasoning:run',
  'user:read',
];

const RESOURCES = catalogResources();

/**
 * What each system role may do.
 *
 * - `owner` holds every permission, including organization changes.
 * - `admin` holds everything except changing the organization, so an admin
 *   cannot grant the owner role (granting needs holding the role's rights).
 */
export const SYSTEM_ROLE_PERMISSIONS: Readonly<Record<SystemRoleName, readonly string[]>> = {
  owner: everythingOn(RESOURCES),
  admin: [...everythingOn(RESOURCES.filter((resource) => resource !== 'organization')), 'organization:read'],
  member: MEMBER,
  viewer: VIEWER,
};
