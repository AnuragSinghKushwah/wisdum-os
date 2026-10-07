# Domain: Organization

> Implemented in [`packages/domain/src/organization/`](../../packages/domain/src/organization/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

The top-level account that groups workspaces and carries organization-wide settings: identity (name and slug), branding, governance policies, and a reference to the billing subscription. An organization owns the relationship to its workspaces; each workspace is managed by the Workspace context.

## Entities

**Organization** (aggregate root) — identified by `OrganizationId`, scoped to a tenant.

| State | Modelled as |
| --- | --- |
| Identity | `OrganizationName` and `OrganizationSlug` (lowercase kebab-case, unique platform-wide) |
| Workspaces | A list of workspace ids (plain UUIDs; the context does not import Workspace) |
| Subscription | `SubscriptionReference`: plan name (lowercase kebab-case), external billing reference, and state `trialing`, `active`, `past-due`, or `cancelled`. No prices, invoices, or payment details; billing is meant to be a plugin. |
| Branding | `Branding`: optional absolute `logoUrl` plus `primaryColor` and `accentColor` as six-digit hex values |
| Policies | `OrganizationPolicies`: an immutable map of dot-namespaced kebab-case keys (for example `sharing.allow-public`, `retention.days`) to JSON scalars, limited in count |
| Lifecycle | `OrganizationStatus` |

### Lifecycle

```
active ◀──▶ suspended
   │            │
   └────────────┴──▶ deleted (terminal)
```

### Behaviors

`rename`, `attachWorkspace`, `detachWorkspace`, `changeSubscription`, `updateBranding`, `setPolicy`, `removePolicy`, `suspend(reason)`, `reactivate`, `markDeleted`, plus the queries `hasWorkspace` and `workspaceCount`. Attaching a workspace that is already attached, or renaming to the same name, is a no-op.

### Invariants

- Only an `active` organization can be modified (rename, attach or detach workspaces, branding, policies). A suspended or deleted one cannot.
- A deleted organization cannot change its subscription. A suspended one still can.
- An organization with attached workspaces cannot be deleted; detach them first. `markDeleted()` is otherwise idempotent.
- Status changes follow the map above.
- Each value object validates itself: UUID ids, non-empty length-limited name, kebab-case slug, absolute logo URL and hex colors, policy key format and count limit, known subscription state.
- Slug uniqueness is a repository concern (`findBySlug`).

## Events

### Published

| Event | Raised by |
| --- | --- |
| `organization.organization.created` | `Organization.create()` |
| `organization.organization.renamed` | `rename()` |
| `organization.organization.suspended` | `suspend()` (payload includes the reason) |
| `organization.organization.reactivated` | `reactivate()` |
| `organization.organization.deleted` | `markDeleted()` |
| `organization.workspace.attached` | `attachWorkspace()` |
| `organization.workspace.detached` | `detachWorkspace()` |
| `organization.subscription.changed` | `changeSubscription()` |
| `organization.branding.updated` | `updateBranding()` |
| `organization.policy.changed` | `setPolicy()` and `removePolicy()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createOrganizationCommand` and `attachWorkspaceCommand`, query `getOrganizationQuery`, with the `OrganizationReadModel` port, in [`packages/application/src/organization/`](../../packages/application/src/organization/).

## Specifications

`OrganizationIsActive`, `OrganizationIsInGoodStanding` (subscription allows paid features), `OrganizationOwnsWorkspace` (takes a workspace id), `OrganizationCanBeDeleted` (no workspaces attached).

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/organizations` | Create an organization. |
| `GET` | `/v1/organizations/:id` | Fetch an organization. |
| `POST` | `/v1/organizations/:id/workspaces` | Attach a workspace. |

Details: [docs/api/organizations.md](../api/organizations.md). Routes are in `apps/api/src/routes/organization-routes.ts`.

## Persistence

`OrganizationRepository` (`findById`, `findBySlug`, `exists`, `save`, `delete`) has PostgreSQL and in-memory implementations. Tables: `organizations`, `organization_policies`, `organization_workspaces` (migration `0002_create_organizations`).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`.

## Open questions

- Only create, fetch, and attach-workspace are exposed. Rename, detach, subscription, branding, policy, suspend, reactivate, and delete exist in the aggregate but have no use case or route.
- Attaching a workspace records the id on the organization without checking that the workspace exists and without updating the Workspace context, so nothing keeps the two sides consistent beyond the event.
- The `Branding` and `OrganizationPolicies` rules are checked in the value objects only; no use case yet applies a policy to workspaces.
