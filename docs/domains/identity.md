# Domain: Identity

> Implemented in [`packages/domain/src/identity/`](../../packages/domain/src/identity/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). How requests are authenticated is recorded in [ADR 0012](../adr/0012-http-api-fastify-bearer-auth-and-tenant-resolution.md).

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

Commands `createUserCommand`, `assignRoleCommand`, `authenticateUserCommand`, `createApiKeyCommand`, `revokeApiKeyCommand`; queries `getUserQuery`, `listApiKeysQuery`; ports `PasswordHasher`, `TokenService`, `UserReadModel`, `ApiKeyReadModel`. In [`packages/application/src/identity/`](../../packages/application/src/identity/).

`AuthenticateUserHandler` looks the user up by email within the tenant, verifies the password through the `PasswordHasher` port, and issues a token through the `TokenService` port. It returns the same error for an unknown email and a wrong password.

## Specifications

`UserIsActive`, `UserHasRole`, `UserHasLocalCredentials`, `RoleAllowsPermission`, `ApiKeyIsUsable`.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/users` | Create a user. |
| `GET` | `/v1/users/:id` | Fetch a user. |
| `POST` | `/v1/users/:id/roles` | Assign a role. |
| `POST` | `/v1/auth/login` | Authenticate with email and password; returns a token. |
| `POST` | `/v1/auth/resolve-tenant` | Look up the tenant for an email. |
| `POST` | `/v1/auth/reset-password-request` | Placeholder; returns a fixed message. |
| `POST` | `/v1/onboarding/setup` | Create a tenant, organization, workspace, and owner user in one call. |
| `GET`, `POST` | `/v1/identity/api-keys` | List and create API keys for the authenticated user. |
| `DELETE` | `/v1/identity/api-keys/:id` | Revoke an API key. |

Details: [docs/api/identity.md](../api/identity.md). Routes are in `apps/api/src/routes/identity-routes.ts`.

## Persistence

Repository ports: `UserRepository` (`findById`, `findByEmail`, `exists`, `save`, `delete`), `RoleRepository` and `PermissionRepository` (`findById`, `findByName`, `findAll`, `save`, `delete`), `ApiKeyRepository` (`findById`, `findByKeyHash`, `save`, `delete`), `ServiceAccountRepository` (`findById`, `findAll`, `save`, `delete`). Tables: `users`, `roles`, `permissions`, `api_keys`, `service_accounts` (migrations 0004 and 0011 to 0014).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`.

## Open questions

- **Nothing enforces authorization.** No code calls `Role.allows`, `ApiKey.allows`, `ApiKey.isUsableAt`, `hasRole`, or any of the identity specifications. Role ids are carried inside issued tokens but never evaluated. API keys can be created (always with empty scopes) but no request is checked against them, and the authentication hook accepts only signed tokens, so an API key cannot authenticate a request.
- **`AuthenticateUserHandler` does not check the user's status**, so a suspended or deleted user could still sign in. No route currently suspends a user.
- **Onboarding bypasses the model.** `POST /v1/onboarding/setup` is unauthenticated and writes the tenant, organization, workspace, and membership rows with raw SQL inside the route, outside the aggregates and without a transaction. A failure partway leaves a partial tenant. The route also falls back to a fixed token string when no token service is wired. This conflicts with the rule that apps are composition layers only.
- **`resolve-tenant` is unauthenticated and not tenant-scoped.** It returns a tenant id for any email it finds, taking the first match across all tenants, and a fixed default tenant otherwise.
- **Password reset is a stub.** `reset-password-request` only logs the email address and returns a fixed message.
- Role and permission management, user suspension, rename, email and password changes, and service accounts have no use cases or routes.
- A second password hasher exists in `platform/auth` (PBKDF2) alongside the scrypt hasher used here; the two produce incompatible hashes.
