/**
 * Every permission the platform can require, grouped by resource.
 *
 * A permission is written `resource:action`, and `resource:*` covers every
 * action on that resource. A route can only require a permission listed here,
 * and a role can only be built from these, so the vocabulary has one source.
 */
export const PERMISSION_CATALOG = {
  agent: ['read', 'run'],
  'api-key': ['manage'],
  capture: ['ingest'],
  conversation: ['read', 'write'],
  dashboard: ['read'],
  document: ['read', 'write'],
  draft: ['read', 'write', 'publish'],
  event: ['read'],
  graph: ['read'],
  knowledge: ['read', 'write', 'publish', 'delete'],
  opportunity: ['read', 'write'],
  organization: ['read', 'write'],
  plugin: ['read', 'manage'],
  reasoning: ['run'],
  search: ['read'],
  'search-index': ['manage'],
  user: ['read', 'manage'],
  workspace: ['read', 'write', 'manage'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type PermissionResource = keyof typeof PERMISSION_CATALOG;

/** A concrete `resource:action` permission from the catalog, e.g. `'knowledge:write'`. */
export type CatalogPermission = {
  [R in PermissionResource]: `${R}:${(typeof PERMISSION_CATALOG)[R][number]}`;
}[PermissionResource];

/** Every catalog resource, in catalog order. */
export function catalogResources(): readonly PermissionResource[] {
  return Object.keys(PERMISSION_CATALOG) as PermissionResource[];
}

/** Every concrete permission in the catalog. */
export function catalogPermissions(): readonly CatalogPermission[] {
  return catalogResources().flatMap((resource) =>
    PERMISSION_CATALOG[resource].map((action) => `${resource}:${action}` as CatalogPermission),
  );
}
