import type { CatalogPermission } from '@wisdum/domain';

/** What a route needs: one permission, or several that must all be held. */
type Requirement = CatalogPermission | readonly CatalogPermission[];

/**
 * The authorization policy of the HTTP API, in one place.
 *
 * Every route that is not marked `config: { public: true }` must appear here,
 * keyed `METHOD /path` exactly as registered. A route missing from this table
 * is refused with 403 rather than served, and `route-permissions.test.ts`
 * fails when the table and the registered routes disagree, so a new endpoint
 * cannot ship without someone deciding who may call it.
 *
 * Permissions come from the catalog in `@wisdum/domain`; a misspelling here is
 * a compile error. Who holds what is defined by the system roles there.
 */
export const ROUTE_PERMISSIONS: Readonly<Record<string, Requirement>> = {
  // Agents
  'GET /v1/agents/tasks': 'agent:read',
  'POST /v1/agents/tasks': 'agent:run',

  // Conversations (AI)
  'POST /v1/conversations': 'conversation:write',
  'GET /v1/conversations/:id': 'conversation:read',
  'POST /v1/conversations/:id/messages': 'conversation:write',
  'POST /v1/conversations/:id/turns': 'conversation:write',

  // Dashboard and live events
  'GET /v1/dashboard/stats': 'dashboard:read',
  'GET /v1/events/stream': 'event:read',

  // Documents
  'POST /v1/documents': 'document:write',
  'GET /v1/documents/:id': 'document:read',
  'PUT /v1/documents/:id/content': 'document:write',

  // Drafts and published content
  'GET /v1/drafts': 'draft:read',
  'GET /v1/drafts/:id': 'draft:read',
  'PUT /v1/drafts/:id': 'draft:write',
  'POST /v1/drafts/:id/publish': 'draft:publish',
  'GET /v1/published': 'draft:read',
  'GET /v1/published/:id': 'draft:read',

  // Knowledge graph
  'GET /v1/graph': 'graph:read',
  'GET /v1/graph/concepts': 'graph:read',
  'GET /v1/graph/neighbors': 'graph:read',
  'GET /v1/graph/relationships': 'graph:read',

  // Identity
  'POST /v1/users': 'user:manage',
  'GET /v1/users/:id': 'user:read',
  'POST /v1/users/:id/roles': 'user:manage',
  'GET /v1/identity/roles': 'user:read',
  'GET /v1/identity/api-keys': 'api-key:manage',
  'POST /v1/identity/api-keys': 'api-key:manage',
  'DELETE /v1/identity/api-keys/:id': 'api-key:manage',

  // Knowledge
  'GET /v1/knowledge': 'knowledge:read',
  'POST /v1/knowledge': 'knowledge:write',
  'GET /v1/knowledge/:id': 'knowledge:read',
  'PATCH /v1/knowledge/:id': 'knowledge:write',
  'DELETE /v1/knowledge/:id': 'knowledge:delete',
  'POST /v1/knowledge/:id/archive': 'knowledge:write',
  'POST /v1/knowledge/:id/content': 'knowledge:write',
  'POST /v1/knowledge/:id/import': 'knowledge:write',
  'POST /v1/knowledge/:id/publish': 'knowledge:publish',
  'POST /v1/knowledge/:id/visibility': 'knowledge:write',
  'POST /v1/knowledge/upload': ['knowledge:write', 'document:write'],

  // Opportunities
  'GET /v1/opportunities': 'opportunity:read',
  'POST /v1/opportunities': 'opportunity:write',
  'GET /v1/opportunities/:id': 'opportunity:read',
  'POST /v1/opportunities/:id/dismiss': 'opportunity:write',
  'POST /v1/opportunities/:id/draft': 'draft:write',

  // Organizations
  'POST /v1/organizations': 'organization:write',
  'GET /v1/organizations/:id': 'organization:read',
  'POST /v1/organizations/:id/workspaces': 'organization:write',

  // Plugins
  'GET /v1/plugins': 'plugin:read',
  'POST /v1/plugins': 'plugin:manage',
  'GET /v1/plugins/:id': 'plugin:read',
  'POST /v1/plugins/:id/disable': 'plugin:manage',
  'POST /v1/plugins/:id/enable': 'plugin:manage',
  'POST /v1/plugins/manifest/validate': 'plugin:read',

  // Reasoning
  'POST /v1/reasoning/run': 'reasoning:run',

  // Search
  'GET /v1/search': 'search:read',
  'POST /v1/search-indexes': 'search-index:manage',
  'GET /v1/search-indexes/:id': 'search:read',
  'POST /v1/search-indexes/:id/documents': 'search-index:manage',
  'GET /v1/search-indexes/:id/search': 'search:read',

  // Inbound capture (typically called with an API key scoped to capture:ingest)
  'POST /v1/webhooks/ingest': 'capture:ingest',
  'POST /v1/webhooks/knowledge': 'capture:ingest',

  // Workspaces
  'GET /v1/workspaces': 'workspace:read',
  'POST /v1/workspaces': 'workspace:write',
  'GET /v1/workspaces/:id': 'workspace:read',
  'POST /v1/workspaces/:id/members': 'workspace:manage',
  'PUT /v1/workspaces/:id/settings': 'workspace:manage',
};

export interface RoutePolicy {
  /** The permissions a route requires, or `undefined` when the route has no policy. */
  requirementsFor(method: string, routePath: string): readonly string[] | undefined;
}

/** Builds the lookup the authentication hook uses. HEAD requests are held to the policy of GET. */
export function createRoutePolicy(
  table: Readonly<Record<string, Requirement>> = ROUTE_PERMISSIONS,
): RoutePolicy {
  return {
    requirementsFor(method, routePath) {
      const verb = method === 'HEAD' ? 'GET' : method;
      const requirement = table[`${verb} ${routePath}`];
      if (requirement === undefined) {
        return undefined;
      }
      return typeof requirement === 'string' ? [requirement] : requirement;
    },
  };
}
