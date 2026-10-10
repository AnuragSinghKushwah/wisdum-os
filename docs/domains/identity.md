# Domain: Identity

> Implemented in [`packages/domain/src/identity/`](../../packages/domain/src/identity/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). How requests are authenticated and authorized is recorded in [ADR 0016](../adr/0016-authentication-authorization-and-tenant-isolation.md) (which builds on [ADR 0012](../adr/0012-http-api-fastify-bearer-auth-and-tenant-resolution.md)).

## Purpose

The actors on the platform and the vocabulary for what they may do: human users, non-human service accounts, roles that bundle permissions, a catalog of permissions, and API keys. The domain never sees plaintext credentials and never hashes; hashing and token signing are infrastructure behind ports.

## Entities

Five aggregate roots, each scoped to a tenant.

| Aggregate | Meaning | Key state |
| --- | --- | --- |
| **User** | A human actor. | `Email` (lowercased, unique per tenant via the repository), `DisplayName` (no control characters), optional `PasswordHash` (absent for federated users), `UserStatus`, role ids. |
| **Role** | A named bundle of permissions. | `RoleName` (lowercase kebab-case), description, `isSystem`, a list of `PermissionName`. |
| **Permission** | An entry in the permission catalog. | `PermissionName`, description. Effectively immutable after registration. |
| **ServiceAccount** | A non-human actor for integrations and automations. | `DisplayName`, description, status `enabled` or `disabled`, role ids. |
| **ApiKey** | A credential owned by a user or service account. | Owner id and type (`user` or `service-account`), label, `keyHash`, scopes (a subset of the owner's permissions), optional expiry, status `active` or `revoked`. |

`PermissionName` has the form `resource:action`, for example `document:read` or `knowledge.asset:publish`; an action of `*` covers every action on the resource.

### User lifecycle

```
active ◀──▶ suspended
   │            │
   └────────────┴──▶ deleted (terminal)
```

### Behaviors

- **User:** `create`, `assignRole`, `revokeRole`, `rename`, `changeEmail`, `changePasswordHash`, `suspend(reason)`, `reactivate`, `markDeleted`, `hasRole`.
- **Role:** `create`, `grantPermission`, `revokePermission`, `describe`, `hasPermission`, `allows(permission)` (honours the `*` wildcard).
- **ServiceAccount:** `create`, `assignRole`, `revokeRole`, `rename`, `describe`, `enable`, `disable`, `hasRole`, `isEnabled`.
- **ApiKey:** `create`, `revoke`, `isExpiredAt`, `isUsableAt` (active and unexpired), `allows(permission)`.

### Access control

Pure domain code in `packages/domain/src/identity/access/`:

- **`PERMISSION_CATALOG`** lists every `resource:action` the platform can require, and `CatalogPermission` is the matching type, so a misspelled permission fails to compile.
- **`SYSTEM_ROLE_PERMISSIONS`** defines the four roles every tenant has (`owner`, `admin`, `member`, `viewer`) in code. They nest: viewer within member within admin within owner. Admin lacks `organization:write`, which stops an admin granting the owner role.
- **`PermissionSet`** holds what an actor may do, with `allows(permission)` (wildcards honoured) and `includesAll(other)` (the no-escalation rule: a wildcard can only be covered by a wildcard).

`AccessPolicy` in the application layer derives each system role's id from the tenant and the role name (a UUIDv5), so resolving a user's permissions from the role ids in their token needs no database lookup, and a role id from another tenant grants nothing. The `roles` and `permissions` tables are reserved for custom roles, which are not supported yet.

### Invariants

- Only an `active` user can be modified; suspended and deleted users cannot. Status changes follow the map above.
- System roles cannot be modified.
- An API key's expiry, when given, must be in the future.
- A password hash must look like a real hash (length bounds), and its `toString()` is redacted so it cannot leak through logs or event payloads.
- Value objects validate themselves: UUID ids, email format and length, display-name rules, role and permission name formats.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `identity.user.created` | `User.create()` |
| `identity.user.suspended` | `suspend()` |
| `identity.user.reactivated` | `reactivate()` |
| `identity.user.deleted` | `markDeleted()` |
| `identity.user.role-assigned` | `User.assignRole()` |
| `identity.user.role-revoked` | `User.revokeRole()` |
| `identity.role.permission-granted` | `Role.grantPermission()` |
| `identity.role.permission-revoked` | `Role.revokePermission()` |
| `identity.api-key.created` | `ApiKey.create()` |
| `identity.api-key.revoked` | `ApiKey.revoke()` |
| `identity.service-account.created` | `ServiceAccount.create()` |
| `identity.service-account.disabled` | `disable()` |
| `identity.service-account.enabled` | `enable()` |

Renaming, changing an email or password hash, creating a role, and assigning roles to a service account raise no events.

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createUserCommand`, `assignRoleCommand`, `authenticateUserCommand`, `createApiKeyCommand`, `revokeApiKeyCommand`; queries `getUserQuery`, `listApiKeysQuery`, `authenticateApiKeyQuery`; ports `PasswordHasher`, `ApiKeyHasher`, `TokenService`, `UserReadModel`, `ApiKeyReadModel`; and `AccessPolicy`. In [`packages/application/src/identity/`](../../packages/application/src/identity/).

`AuthenticateUserHandler` looks the user up by email within the tenant, verifies the password through the `PasswordHasher` port, and issues a token through the `TokenService` port. It returns the same error for an unknown email and a wrong password.

`AuthenticateApiKeyHandler` turns a presented `w_sk_…` key into its tenant, owner, and scopes: it hashes the key with the `ApiKeyHasher` port (SHA-256, deterministic, which suits a 192-bit machine-generated secret and lets `findByKeyHash` work), then checks `ApiKey.isUsableAt(now)`. Unknown, malformed, revoked, and expired keys all fail with the same message.

`CreateApiKeyHandler` requires at least one scope and refuses scopes the creator does not hold. `AssignRoleHandler` accepts only one of the tenant's system role ids, treats a user from another tenant as missing, and refuses a role that grants more than the assigner holds.

## Specifications

`UserIsActive`, `UserHasRole`, `UserHasLocalCredentials`, `RoleAllowsPermission`, `ApiKeyIsUsable`.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/users` | Create a user. Needs `user:manage`. |
| `GET` | `/v1/users/:id` | Fetch a user in the caller's tenant. Needs `user:read`. |
| `POST` | `/v1/users/:id/roles` | Assign a system role. Needs `user:manage`. |
| `GET` | `/v1/identity/roles` | List the tenant's system roles and their ids. Needs `user:read`. |
| `POST` | `/v1/auth/login` | **Public.** Authenticate with email and password; returns a token. |
| `POST` | `/v1/auth/resolve-tenant` | **Public.** Look up the tenant for an email. |
| `POST` | `/v1/auth/reset-password-request` | **Public.** Placeholder; returns a fixed message. |
| `POST` | `/v1/onboarding/setup` | **Public**, but closed once a tenant exists unless `WISDUM_ALLOW_SIGNUP=true`. Creates a tenant, organization, workspace, and an owner user. |
| `GET`, `POST` | `/v1/identity/api-keys` | List and create API keys. Needs `api-key:manage`. |
| `DELETE` | `/v1/identity/api-keys/:id` | Revoke an API key. Needs `api-key:manage`. |

Details: [docs/api/identity.md](../api/identity.md). Routes are in `apps/api/src/routes/identity-routes.ts`.

## Persistence

Repository ports: `UserRepository` (`findById`, `findByEmail`, `exists`, `save`, `delete`), `RoleRepository` and `PermissionRepository` (`findById`, `findByName`, `findAll`, `save`, `delete`), `ApiKeyRepository` (`findById`, `findByKeyHash`, `save`, `delete`), `ServiceAccountRepository` (`findById`, `findAll`, `save`, `delete`). Tables: `users`, `roles`, `permissions`, `api_keys`, `service_accounts` (migrations 0004 and 0011 to 0014).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`.

## Open questions

- **Role changes and suspension apply at next sign-in.** Permissions are computed from the role ids inside a 12-hour token and there is no revocation list, so removing a role or suspending a user does not end sessions already issued. `AuthenticateUserHandler` still does not check the user's status, so a suspended or deleted user could sign in.
- **Onboarding still bypasses the model.** `provisionTenant` (`apps/api/src/bootstrap/provision-tenant.ts`) writes the tenant, organization, workspace, and membership rows with raw SQL, outside the aggregates and without a transaction, and the user is saved separately. A failure partway leaves a partial tenant. The first-tenant check and the insert are also separate steps. This conflicts with the rule that apps are composition layers only.
- **`resolve-tenant` is public and not tenant-scoped.** It returns the tenant id of the first user with a given email across all tenants, and a fixed default tenant otherwise. A tenant id is no longer a credential, but the route reveals which emails are registered, and sign-in has no rate limit.
- **Password reset is a stub.** `reset-password-request` only logs the email address and returns a fixed message.
- Only the four system roles can be assigned. Custom roles, role and permission management, user suspension, rename, email and password changes, and service accounts have no use cases or routes.
- A second password hasher exists in `platform/auth` (PBKDF2) alongside the scrypt hasher used here; the two produce incompatible hashes.
