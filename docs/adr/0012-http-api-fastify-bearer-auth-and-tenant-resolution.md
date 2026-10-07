# 0012 — HTTP API: Fastify, bearer tokens, and tenant resolution

- **Status:** Accepted, with known deficiencies listed under Consequences
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `dad8b3d` (API wiring) and `2e96568` (authentication, Sprint 007), then adjusted during UAT fixes in July 2026. Rationale is reconstructed from the code and history.
- **Supersedes:** [ADR 0003](0003-core-technology-stack.md) (FastAPI as the backend framework)

## Context

[ADR 0003](0003-core-technology-stack.md) chose FastAPI; [ADR 0005](0005-core-runtime-language.md) moved the core platform to TypeScript, so the API application is a TypeScript service. It must expose the platform's capabilities as versioned REST endpoints ([docs/api](../api/README.md)), authenticate callers, and scope every request to a tenant.

## Decision

- **Fastify 5** is the HTTP framework. `apps/api` is a composition root ([ADR 0008](0008-application-infrastructure-kernel-layering.md)): one `routes/<context>-routes.ts` per context calls application handlers, and contains no business logic. Endpoints live under `/v1`. Request bodies and parameters are validated with JSON Schema objects in `validation/<domain>-schemas.ts`, and OpenAPI is served through `@fastify/swagger`.
- **Authentication is a bearer token.** `JwtTokenService` issues and verifies HS256 tokens using Node's `crypto` (12-hour lifetime) rather than a third-party JWT library. `createAuthHook` verifies a presented token and attaches a principal `{ userId, tenantId, roleIds }` to the request. Passwords are hashed with scrypt (`ScryptPasswordHasher`) behind the application's `PasswordHasher` port.
- **The tenant comes from the verified token.** `requireTenantId` returns the principal's tenant when one is present, so a caller cannot choose a different tenant than the one their token was issued for. Routes that run before authentication (login, signup) read the tenant from the `x-tenant-id` header.
- **Webhooks** (`POST /v1/webhooks/<domain>`) authenticate with an `x-api-key` header compared against `WISDUM_API_KEY`.

## Consequences

- One service language, one validation and typing story across domain, application, and API.
- Hand-rolled JWT keeps dependencies down, at the cost of owning correctness: only HS256, no key rotation, no revocation, and a single shared secret.

**Known deficiencies.** These were introduced as development conveniences. They are recorded here as defects to fix, not accepted risks:

1. **A hard-coded authentication bypass.** `apps/api/src/middleware/auth-context.ts` accepts the literal bearer tokens `dev-token`, `dev-session-token`, and `mock-jwt-token` and grants an admin principal on a fixed tenant, in every environment. Anyone who can reach the API can present one of them.
2. **A publicly known signing secret.** `CoreModule` falls back to `JWT_SECRET='dev-secret-change-me'` when the variable is unset, so a deployment that forgets to set it signs tokens anyone can forge.
3. **A default webhook key.** `WISDUM_API_KEY` falls back to `dev-webhook-key`.
4. **The tenant header is trusted before authentication**, and the web client attaches a default development tenant header.
5. **Authorization is not enforced.** The domain models roles, permissions, and API keys ([identity.md](../domains/identity.md)), and role identifiers travel inside tokens, but no code evaluates them. Any authenticated caller can call any endpoint in its tenant, and an API key cannot authenticate a request because the authentication hook accepts only signed tokens. `AuthenticateUserHandler` also does not check the user's status.
6. **Two password hashers exist** — scrypt in `packages/infrastructure` and PBKDF2 in `platform/auth` — and hashes from one do not verify with the other. One must be chosen and the other removed.
7. **Unauthenticated tenant creation.** `POST /v1/onboarding/setup` lets anyone create a tenant, organization, workspace, and owner user. It does so with raw SQL inside the route handler, outside the aggregates and without a transaction, so a failure partway leaves a partial tenant.
8. **`POST /v1/auth/resolve-tenant` is unauthenticated and not tenant-scoped.** It returns the tenant id of the first user found with a given email across all tenants.

Items 1–3 should be gated to a development environment or removed, with startup failing in production when `JWT_SECRET` or `WISDUM_API_KEY` is missing. That change needs its own review because the web app and the end-to-end suite currently rely on the development tokens. Items 5, 7, and 8 need product decisions (an authorization model, and whether onboarding is open or invitation-only) and each deserves its own ADR.

## Alternatives considered

- **FastAPI.** Superseded by ADR 0005.
- **NestJS or Express.** Not taken: Fastify's schema-first validation and OpenAPI integration fit the API-first principle with less framework surface.
- **A third-party JWT library or an external identity provider.** Not taken for now; authentication providers are meant to arrive as plugins ([ADR 0013](0013-plugin-system-sdk-runtime-and-sandbox.md)).
