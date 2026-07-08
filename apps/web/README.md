# @wisdum/web

Next.js App Router client of the platform APIs, with no privileged access.
Routing and layout only — no business logic, no direct calls into
`packages/domain` or `packages/application`. All data access goes through
`src/lib/api-client.ts`, a thin fetch wrapper against the real Fastify API
(`apps/api`, `NEXT_PUBLIC_API_URL`, default `http://localhost:3001`). The
session (bearer token, user id, tenant id) lives in `localStorage` via
`src/lib/auth-context.tsx` — there is no server-side session of any kind,
consistent with this app having no privileged access.

## Shells

- `(auth)` — sign-in / sign-up, calling `POST /v1/auth/login` and
  `POST /v1/users`. Tenant provisioning has no API yet, so both forms take
  a tenant ID directly (defaults to `default` for local development).
- `(dashboard)` — authenticated chrome (sidebar nav), redirects to
  `/sign-in` if no session is present. Wraps every feature area:
  - `dashboard/` — session overview and quick links
  - `knowledge/` — list + create (`GET`/`POST /v1/knowledge`),
    `knowledge/[id]` for detail, publish, and archive
  - `workspace/` — create a workspace and look one up by ID (the API has
    no "list workspaces" endpoint yet)
  - `plugins/` — install a plugin, look one up by ID, enable/disable
  - `settings/` — current session's user and tenant ID

## Commands

- `npm run dev --workspace @wisdum/web` — start the dev server
- `npm run build --workspace @wisdum/web` — production build
- `npm run start --workspace @wisdum/web` — serve the production build

This app is excluded from the root `tsc -b` composite project graph:
Next.js manages its own TypeScript compilation and type-checking
(`next build`), which is incompatible with the `composite`/`declaration`
project-reference style the rest of the monorepo uses.
