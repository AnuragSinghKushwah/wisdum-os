# Domain: Workspace

> Implemented in [`packages/domain/src/workspace/`](../../packages/domain/src/workspace/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

The collaboration container for knowledge work: a named space with members, configuration, usage limits, and feature flags. Workspaces belong to an organization and are where access to knowledge is shared (the `workspace` visibility level on a knowledge asset refers to this boundary).

## Entities

**Workspace** (aggregate root) — identified by `WorkspaceId`, scoped to a tenant.

| State | Modelled as |
| --- | --- |
| Identity | `WorkspaceName` and `WorkspaceSlug` (lowercase kebab-case, unique within an organization) |
| Owner organization | `organizationId`, a plain UUID; the Organization aggregate tracks the inverse side |
| Members | A list of `WorkspaceMember` value objects: user id, role, and join time. Roles: `owner`, `admin`, `member`, `guest`. A user appears at most once. |
| Settings | `WorkspaceSettings`: a map of dot-namespaced kebab-case keys (for example `knowledge.default-visibility`) to string, number, or boolean values, limited in count |
| Limits | `WorkspaceLimits`: optional `maxMembers`, `maxKnowledgeAssets`, and `maxStorageBytes`; absent means unlimited |
| Feature flags | `FeatureFlags`: kebab-case flag names to booleans; an absent flag is disabled |
| Lifecycle | `WorkspaceStatus` |

### Lifecycle

```
active ◀──▶ archived
   │            │
   └────────────┴──▶ deleted (terminal)
```

### Behaviors

`Workspace.create()`, `rename`, `addMember`, `removeMember`, `changeMemberRole`, `setSetting`, `removeSetting`, `applyLimits`, `toggleFeatureFlag`, `archive`, `restore`, `markDeleted`, plus the queries `isMember` and `memberCount`.

### Invariants

- A workspace always has at least one owner. The creator becomes the first owner at creation, and removing or demoting the last owner is rejected.
- Adding a member beyond `maxMembers` is rejected. Adding someone already a member is a no-op.
- Changing the role of a non-member is rejected.
- Only an `active` workspace can be modified; archived and deleted ones cannot.
- Status changes follow the map above. `markDeleted()` is idempotent.
- Each value object validates itself: UUID ids, non-empty length-limited name, kebab-case slug, known member role, setting and flag name format and count limits, non-negative integer limits.
- Slug uniqueness within an organization is a repository concern.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `workspace.workspace.created` | `Workspace.create()` |
| `workspace.workspace.renamed` | `rename()` |
| `workspace.workspace.archived` | `archive()` |
| `workspace.workspace.restored` | `restore()` |
| `workspace.workspace.deleted` | `markDeleted()` |
| `workspace.member.added` | `Workspace.create()` (for the first owner) and `addMember()` |
| `workspace.member.removed` | `removeMember()` |
| `workspace.member.role-changed` | `changeMemberRole()` |
| `workspace.settings.changed` | `setSetting()` and `removeSetting()` |
| `workspace.limits.changed` | `applyLimits()` |
| `workspace.feature-flag.toggled` | `toggleFeatureFlag()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createWorkspaceCommand`, `addWorkspaceMemberCommand`, `updateWorkspaceSettingsCommand`; queries `getWorkspaceQuery`, `listWorkspacesQuery`; the `WorkspaceReadModel` port. In [`packages/application/src/workspace/`](../../packages/application/src/workspace/). `CreateWorkspaceHandler` derives a slug from the name and appends a suffix until it is unique.

## Specifications

`WorkspaceIsActive`, `WorkspaceHasMember` (takes a user id), `WorkspaceCanAcceptMember` (not at the member limit), `WorkspaceHasFeature` (takes a flag name).

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/workspaces` | Create a workspace. |
| `GET` | `/v1/workspaces` | List workspaces. |
| `GET` | `/v1/workspaces/:id` | Fetch a workspace. |
| `POST` | `/v1/workspaces/:id/members` | Add a member. |
| `PUT` | `/v1/workspaces/:id/settings` | Set one setting (`key`, `value`). |

Details: [docs/api/workspaces.md](../api/workspaces.md). Routes are in `apps/api/src/routes/workspace-routes.ts`.

## Persistence

`WorkspaceRepository` (`findById`, `findBySlug`, `findByOrganization`, `findByTenant`, `exists`, `save`, `delete`) has PostgreSQL and in-memory implementations. Tables: `workspaces`, `workspace_members`, `workspace_settings`, `workspace_feature_flags` (migration `0003_create_workspaces`).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. The context has no domain services.

## Open questions

- **Setting values are not validated at runtime.** The domain types a setting as `string | number | boolean`, but `PUT /v1/workspaces/:id/settings` declares no body schema and the handler casts the incoming `value` to that type. An object or array sent by a client would be stored as given.
- Rename, remove member, change role, remove setting, apply limits, toggle feature flag, archive, restore, and delete exist in the aggregate but have no use case or route.
- Limits (`maxKnowledgeAssets`, `maxStorageBytes`) are stored but only the member limit is enforced; nothing in the Knowledge or Document contexts consults them.
- The create route accepts `organizationId` without checking that the organization exists or attaching the workspace to it.
