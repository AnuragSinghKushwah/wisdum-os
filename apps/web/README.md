# @wisdum/web

Next.js App Router client of the platform APIs, with no privileged access.
Routing and layout only — no business logic, no direct calls into
`packages/domain` or `packages/application`.

## Shells

- `(auth)` — sign-in / sign-up, unauthenticated chrome
- `(dashboard)` — authenticated chrome (sidebar nav), wraps every feature area:
  - `dashboard/` — overview
  - `knowledge/` — knowledge assets, `knowledge/[id]` for detail
  - `workspace/` — members, limits, feature flags
  - `plugins/` — installed plugins
  - `settings/` — account, organization, and workspace settings

## Commands

- `npm run dev --workspace @wisdum/web` — start the dev server
- `npm run build --workspace @wisdum/web` — production build
- `npm run start --workspace @wisdum/web` — serve the production build

This app is excluded from the root `tsc -b` composite project graph:
Next.js manages its own TypeScript compilation and type-checking
(`next build`), which is incompatible with the `composite`/`declaration`
project-reference style the rest of the monorepo uses.
