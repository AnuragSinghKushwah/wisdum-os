# Identity & Authentication API Specification

Sign-in, sign-up, users and roles, and API keys. The decisions behind this are in
[ADR 0016](../adr/0016-authentication-authorization-and-tenant-isolation.md); the domain model is in
[docs/domains/identity.md](../domains/identity.md).

## How requests are authenticated

Every endpoint needs a credential except the ones marked **public** below. Send exactly one of:

| Credential | How | Typical use |
| --- | --- | --- |
| Session token | `Authorization: Bearer <token>` (from sign-in or sign-up; valid 12 hours) | People using the web app or scripts acting as themselves |
| API key | `x-api-key: w_sk_…` or `Authorization: Bearer w_sk_…` | Integrations, webhooks, automation |

The tenant is taken from the credential. An `x-tenant-id` header is only read on the sign-in endpoint,
before a credential exists, and is ignored everywhere else.

| Status | Code | Meaning |
| --- | --- | --- |
| `401` | `authentication_error` | No credential, or it is invalid, expired, revoked, or both kinds were sent |
| `403` | `authorization_error` | The credential is valid but does not hold the permission the endpoint needs; `error.details.required` lists what is missing |
| `404` | `not_found` | The resource does not exist **in your tenant** (another tenant's resource looks the same) |

## Permissions and roles

A permission is `resource:action`; `resource:*` covers every action. Each tenant has four roles, defined in
code:

| Permission | owner | admin | member | viewer |
| --- | :-: | :-: | :-: | :-: |
| `agent:read` | yes | yes | yes | yes |
| `agent:run` | yes | yes | yes |  |
| `api-key:manage` | yes | yes |  |  |
| `capture:ingest` | yes | yes |  |  |
| `conversation:read` | yes | yes | yes | yes |
| `conversation:write` | yes | yes | yes |  |
| `dashboard:read` | yes | yes | yes | yes |
| `document:read` | yes | yes | yes | yes |
| `document:write` | yes | yes | yes |  |
| `draft:read` | yes | yes | yes | yes |
| `draft:write` | yes | yes | yes |  |
| `draft:publish` | yes | yes |  |  |
| `event:read` | yes | yes | yes | yes |
| `graph:read` | yes | yes | yes | yes |
| `knowledge:read` | yes | yes | yes | yes |
| `knowledge:write` | yes | yes | yes |  |
| `knowledge:publish` | yes | yes |  |  |
| `knowledge:delete` | yes | yes |  |  |
| `opportunity:read` | yes | yes | yes | yes |
| `opportunity:write` | yes | yes | yes |  |
| `organization:read` | yes | yes | yes | yes |
| `organization:write` | yes |  |  |  |
| `plugin:read` | yes | yes | yes | yes |
| `plugin:manage` | yes | yes |  |  |
| `reasoning:run` | yes | yes | yes |  |
| `search:read` | yes | yes | yes | yes |
| `search-index:manage` | yes | yes |  |  |
| `user:read` | yes | yes | yes |  |
| `user:manage` | yes | yes |  |  |
| `workspace:read` | yes | yes | yes | yes |
| `workspace:write` | yes | yes |  |  |
| `workspace:manage` | yes | yes |  |  |

Which permission each endpoint needs is in
[`apps/api/src/security/route-permissions.ts`](../../apps/api/src/security/route-permissions.ts). An API key
holds only its scopes, whatever role its owner has.

**You cannot give away more than you hold.** Assigning a role needs every permission the role grants, and
minting an API key needs every scope on it. An admin cannot make anyone an owner.

**Role changes take effect at the next sign-in**, because the token carries the role ids and there is no
revocation list yet.

---

## 1. Sign up (`POST /v1/onboarding/setup`) — public

Creates a tenant, an organization, a workspace, and the first user, who becomes the tenant's **owner**.

Sign-up is closed once an instance has a tenant, unless it runs with `WISDUM_ALLOW_SIGNUP=true`; a closed
instance answers `403`. The first tenant on a fresh instance can always be created.

```bash
curl -X POST http://localhost:3001/v1/onboarding/setup \
  -H "Content-Type: application/json" \
  -d '{
    "orgName": "Acme Corp",
    "orgSlug": "acme-corp",
    "displayName": "Ada Lovelace",
    "email": "ada@acme.example",
    "password": "at-least-8-characters"
  }'
```

`orgSlug` must be lowercase letters, digits, and single hyphens. Response (`201`):

```json
{ "userId": "…", "token": "eyJhbGciOi…", "tenantId": "…" }
```

## 2. Find a tenant (`POST /v1/auth/resolve-tenant`) — public

Returns the tenant id for an email, so a sign-in form needs only an email and password.

```bash
curl -X POST http://localhost:3001/v1/auth/resolve-tenant \
  -H "Content-Type: application/json" -d '{ "email": "ada@acme.example" }'
```

```json
{ "tenantId": "…" }
```

## 3. Sign in (`POST /v1/auth/login`) — public

```bash
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: <tenantId from step 2>" \
  -d '{ "email": "ada@acme.example", "password": "at-least-8-characters" }'
```

```json
{ "userId": "…", "token": "eyJhbGciOi…" }
```

An unknown email and a wrong password return the same `401`.

## 4. Reset a password (`POST /v1/auth/reset-password-request`) — public

A placeholder: it accepts `{ "email": "…" }` and always answers with the same message. No email is sent yet.

## 5. List roles (`GET /v1/identity/roles`) — needs `user:read`

Returns the tenant's four roles with their ids, which you need to assign one. The ids differ per tenant.

```json
[
  { "id": "…", "name": "owner", "permissions": ["agent:*", "…"] },
  { "id": "…", "name": "admin", "permissions": ["…"] }
]
```

## 6. Users

| Endpoint | Needs | Notes |
| --- | --- | --- |
| `POST /v1/users` | `user:manage` | Body: `email`, `displayName`, optional `password`. The new user has no role until you assign one. |
| `GET /v1/users/:id` | `user:read` | `404` for a user in another tenant. |
| `POST /v1/users/:id/roles` | `user:manage` | Body: `{ "roleId": "<id from step 5>" }`. `400` for an unknown role; `403` if you do not hold everything the role grants. |

## 7. API keys

All three need `api-key:manage`.

### Create (`POST /v1/identity/api-keys`)

```bash
curl -X POST http://localhost:3001/v1/identity/api-keys \
  -H "authorization: Bearer $WISDUM_TOKEN" -H "Content-Type: application/json" \
  -d '{ "label": "Docs importer", "scopes": ["capture:ingest"] }'
```

`scopes` is required and must contain at least one permission you hold. Response (`201`):

```json
{ "apiKeyId": "…", "plaintextKey": "w_sk_4e0f…" }
```

**The key is shown once.** Only a hash is stored, so a lost key cannot be recovered: revoke it and make
another.

### List (`GET /v1/identity/api-keys`)

```json
[
  {
    "id": "…",
    "label": "Docs importer",
    "status": "active",
    "scopes": ["capture:ingest"],
    "createdAt": "2026-10-09T12:00:00.000Z"
  }
]
```

### Revoke (`DELETE /v1/identity/api-keys/:id`)

Returns `204`. A revoked key stops working immediately.

---

## Upgrading an existing instance

Users created before roles were enforced have none, so they can sign in but every request returns `403`.
Give each of them a role with [`tools/grant-system-role`](../../tools/grant-system-role/README.md). API keys
created before this change can never authenticate (they were stored in a form that cannot be looked up);
revoke them and create new ones.

## Running locally

- Leave `JWT_SECRET` unset in development to get a random per-process secret; sessions end when the API
  restarts. In production it is required (at least 32 characters).
- `WISDUM_DEV_SEED=true` creates `dev@wisdum.local` (password `wisdum-dev-password`) as owner of a fixed
  development tenant. Set `NEXT_PUBLIC_WISDUM_DEV_SEED=true` as well to show the web app's "Quick Dev Sign In"
  button. The API refuses to start with the seed enabled in production.
