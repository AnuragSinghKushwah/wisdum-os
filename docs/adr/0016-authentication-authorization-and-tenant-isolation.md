# 0016 — Authentication, authorization, and tenant isolation

- **Status:** Accepted
- **Date:** 2026-10-09
- **Deciders:** Founding maintainer
- **Supersedes:** the "Known deficiencies" 1–5 and 7 of [ADR 0012](0012-http-api-fastify-bearer-auth-and-tenant-resolution.md); the rest of ADR 0012 still stands.

## Context

[ADR 0012](0012-http-api-fastify-bearer-auth-and-tenant-resolution.md) recorded several authentication shortcuts as defects. Investigating them showed the real position was worse than the list suggested:

- Only the three API-key routes required a verified identity. Every other route trusted a caller-supplied `x-tenant-id` header, so knowing (or discovering, through `POST /v1/auth/resolve-tenant`) a tenant id was enough to read and write that tenant.
- Three literal bearer tokens (`dev-token`, `dev-session-token`, `mock-jwt-token`) granted an admin principal in every environment.
- Token signing fell back to a public secret (`dev-secret-change-me`), and `docker-compose.prod.yml` shipped another (`wisdum-prod-jwt-secret-replace-in-production`) plus a default database password. The prod compose file set `NODE_ENV=production`, but the platform decides its environment from `WISDUM_ENV`, so "production" guards would not have fired there.
- Roles, permissions, and API keys were modelled but never evaluated. API keys could not authenticate at all: they were stored as a randomly salted scrypt hash but looked up by exact hash equality, which can never match.
- `POST /v1/onboarding/setup` was open to anyone, and issued an owner a token with no roles.
- Handlers that load an aggregate by id never checked it belonged to the caller's tenant. A user of one tenant could read, change, or delete another tenant's knowledge, documents, organizations, workspaces, plugins, search indexes, and conversations, run a search against another tenant's index, and read or re-role another tenant's users. A probe that created one of each resource in one tenant and attacked it from another found 20 such holes.
- Payloads let a client name the actor (`createdBy` on a workspace, `ownerId` on a conversation) and point at ids from other tenants (a workspace under another tenant's organization, another tenant's user as a workspace member, another tenant's document as a content reference).

## Decision

**Authentication is default-deny.** A single `onRequest` hook (`createAuthHook`) authenticates every request. A route is reachable without credentials only if it declares `config: { public: true }`. Exactly nine routes do: the three health probes, `/metrics`, login, resolve-tenant, password-reset request, onboarding, and `GET /v1/published/:id`. The last is intentional: published content is shared by its unguessable id (the web app has a public page for it), and viewing it counts a view, which makes it the one public route that writes. A test pins that list, so exposing another route is a deliberate, reviewed change. Public routes never receive a principal, so a stale or valid credential sent to them has no effect. `/docs` is public by path.

**Two credential types, never both.** A request carries either a signed session token (`Authorization: Bearer <jwt>`) or an API key (`x-api-key: w_sk_…` or `Authorization: Bearer w_sk_…`). Sending both is rejected.

**Secrets have no public defaults.** `JWT_SECRET` must be at least 32 characters and must not be a known default or an unreplaced placeholder (such as the example text in `.env.production.example`, which is now blank), in every environment. In production it is required and the API refuses to start without it. In development and test an unset secret becomes a random per-process secret, so tokens end on restart rather than being forgeable. `NODE_ENV=production` counts as production even if `WISDUM_ENV` says otherwise. The compose files no longer carry usable defaults for the JWT secret or the production database password.

**API keys authenticate and carry scopes.**
- A key is `w_sk_` plus 192 random bits, shown once, stored as SHA-256. A deterministic hash is appropriate here because the secret is machine-generated and high-entropy (the usual reason to salt a password hash does not apply), and it makes `ApiKeyRepository.findByKeyHash` work as designed. User passwords keep scrypt.
- A key must have at least one scope, and its scopes cannot exceed the permissions of the person who created it.
- The global `WISDUM_API_KEY` and `dev-webhook-key` are removed. Webhook callers use a key with the `capture:ingest` scope, and the key determines the tenant.
- Keys created before this change were hashed with scrypt and can never authenticate. Revoke and re-issue them.

**Authorization is a permission check on every route.**
- Permissions are `resource:action` names from one catalog in `@wisdum/domain` (`PERMISSION_CATALOG`).
- Each tenant has four system roles: `owner`, `admin`, `member`, `viewer`. Their permissions are defined in code, so a release that adds a permission applies to every tenant at once and there is no per-tenant policy data to drift or migrate. `admin` lacks `organization:write`, `member` cannot publish, delete, or administer, and `viewer` can only read.
- A role's id is derived from the tenant and the role name (a UUIDv5), so resolving a user's permissions needs no database lookup and a role id from another tenant grants nothing. The `roles` and `permissions` tables are reserved for custom roles, which are not supported yet.
- `apps/api/src/security/route-permissions.ts` maps every non-public route to the permission(s) it needs. A route missing from the table is refused with 403. A test boots the real server and checks the table against the registered routes in both directions, so an endpoint cannot ship without a decision about who may call it.
- An API key is held to its scopes, not to its owner's roles.
- **No escalation.** Assigning a role requires holding every permission the role grants; minting an API key requires holding every scope on it. An admin therefore cannot make anyone an owner, and a narrowly scoped key cannot mint a broader one.

**Tenant isolation is enforced where data is loaded.** The tenant comes only from the verified credential; the `x-tenant-id` header is honoured solely on the pre-login routes, and a `tenantId` in a request body is ignored. Handlers, read models, the index search handler, and the conversation runtime take the caller's tenant and treat a resource from another tenant exactly as missing (404, same message), so existence is not revealed. Read-model ports are tenant-scoped by signature (`findById(tenantId, id)`), so a new read model cannot forget the filter silently.

**Claimed identities and references are checked.** The actor of a request is the authenticated user: `createdBy` and `ownerId` are optional and a value other than the caller's is refused (403). A command that points at another resource (a workspace's organization, a workspace attached to an organization, a member's user, a knowledge asset's document) is refused unless that resource is in the same tenant.

`tenant-isolation.test.ts` boots the real server with two tenants, has one create a resource of every type, and checks the other cannot read, change, delete, list, or reference any of it, and that the first tenant's data is unchanged afterwards.

**Onboarding is closed by default.** The first tenant on an instance can always be created (self-hosted bootstrap). After that, `POST /v1/onboarding/setup` returns 403 unless `WISDUM_ALLOW_SIGNUP=true`. The creator becomes the tenant's `owner`. The request is validated (slug format, password of at least 8 characters).

**Local development uses real authentication.** `WISDUM_DEV_SEED=true` creates `dev@wisdum.local` as owner of a fixed development tenant. The web app shows "Quick Dev Sign In" only when `NEXT_PUBLIC_WISDUM_DEV_SEED=true`, and it signs in through the normal login endpoint. The API refuses to start with the seed enabled in production. There is no bypass code path.

## Consequences

- Every endpoint now needs a credential. Integrations that sent only `x-tenant-id` or the shared webhook key stop working until they use a real token or a scoped API key.
- **Existing users have no roles** and receive 403 everywhere until they are given one. Use `tools/grant-system-role.mjs` to give an existing user a role (see [docs/api/identity.md](../api/identity.md)).
- The web sign-up page works only on a fresh instance unless `WISDUM_ALLOW_SIGNUP=true`.
- Developers add a line to the route table with every new route; the completeness test enforces it.
- `GET /v1/users/:id`, `POST /v1/users/:id/roles`, and the other id-based routes now answer 404 for another tenant's resources, where some previously returned them. `POST /v1/workspaces` and `POST /v1/conversations` no longer require `createdBy` / `ownerId`.
- A conversation that does not exist, or belongs to another tenant, now returns 404 from `POST /v1/conversations/:id/turns`; the runtime used an error code the API did not map, so it answered 500.

**Limitations that remain** (not fixed here):

1. **Role changes and suspension take effect at next sign-in.** Permissions are computed from the role ids inside the token (12-hour lifetime), and there is no token revocation. Removing a role, or suspending a user, does not end existing sessions, and a suspended user's API keys keep working. `AuthenticateUserHandler` also still does not check the user's status.
2. **No custom roles or role management routes.** Only the four system roles can be assigned.
3. **Onboarding is still not atomic**: it writes the tenant, organization, workspace, and membership rows with raw SQL in `apps/api/src/bootstrap/provision-tenant.ts` before the user is saved through its repository, so a failure partway leaves a partial tenant. The first-tenant check and the insert are separate steps, so two simultaneous first-run requests could both pass.
4. **`POST /v1/auth/resolve-tenant` is still public** and returns the tenant of the first user with a given email. It no longer grants access (a tenant id is not a credential), but it reveals which email addresses are registered. Login also has no rate limiting.
5. **Two password hashers exist** (scrypt in `packages/infrastructure`, PBKDF2 in `platform/auth`) and are incompatible.
6. Redis and PostgreSQL ports are published to the host by `docker-compose.prod.yml`, and Redis has no password.

## Alternatives considered

- **Per-route permission declarations** (`config: { permission }` on each route). Colocated, but it scatters the policy across ~75 route definitions. One reviewable table with a completeness test gives the same fail-closed guarantee and lets a reviewer read the whole policy at once.
- **Persisting system roles per tenant.** Matches the existing `roles` table, but needs seeding, backfilling, and a sync step whenever the catalog changes. Code-defined roles with derived ids avoid all three.
- **Loading the user's roles on every request** to make revocation immediate. Costs a lookup per request and was not needed for a first enforcement pass; token lifetime is the documented limit above.
- **Keeping a flagged dev bypass** (`WISDUM_DEV_AUTH=true`). Least work, but it leaves a bypass in the codebase that is one environment variable away from production. A seeded real account exercises the real code path instead.
- **Salted hashes for API keys** with the key id inside the key. Keeps one hasher, at the cost of a scrypt computation per machine request.
