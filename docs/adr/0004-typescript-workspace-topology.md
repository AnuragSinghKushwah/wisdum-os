# 0004 — TypeScript workspace topology and package boundaries

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

Sprint 001 moves the repository from documentation-only to a production scaffold. Before any functionality lands, the monorepo (ADR 0002) needs a concrete workspace: how packages are laid out, how boundaries are enforced, and how everything builds from the repository root. Without this, early code would accrete ad-hoc structure that is expensive to unwind.

## Decision

We will structure the TypeScript workspace as follows:

- **npm workspaces** over `apps/*`, `packages/*`, and `platform/*`, with **TypeScript project references** providing topological, incremental builds from the root (`tsc -b`).
- **Layering:**
  - `apps/` are composition layers only — they wire packages together and contain no business logic.
  - Core business logic resides in `packages/domain`, organized by bounded context.
  - Shared interfaces live in `packages/contracts`; cross-package communication uses the interfaces in `packages/events`.
  - Platform capabilities (auth, ai, plugins, search, storage, jobs) are isolated under a new top-level `platform/` directory, one package per capability.
  - Shared infrastructure (`config`, `logger`, `errors`, `types`, `database`) lives in `packages/`.
- **Every package exposes a single public API via `src/index.ts`**, enforced by the package `exports` map and a lint rule banning deep imports (`@wisdum/*/src/*`).
- **Shared tooling at the root:** one `tsconfig.base.json` (strict, NodeNext, composite) with `@wisdum/*` path aliases, one ESLint flat config, one Prettier config. Declared `dependencies` and `tsconfig` references must stay in lockstep; an undeclared reference fails the build.

## Consequences

- The workspace builds, typechecks, and lints from the root with no per-package ceremony; CI validates install → typecheck → build → lint on every PR.
- Package boundaries are mechanically enforced: TypeScript refuses imports from unreferenced projects, and lint refuses deep imports, so boundary violations fail fast instead of accreting.
- `platform/` is added to the top-level layout defined in ADR 0002.
- **Tension with ADR 0003 to resolve:** ADR 0003 designates FastAPI/Python for backend domain services under `services/`, while this sprint places core business logic in `packages/domain` (TypeScript) with `apps/api` as a composition root. This ADR decides workspace topology only, not the backend service language. A follow-up ADR must reconcile the two before the first domain implementation — either superseding ADR 0003's backend choice or defining how the TypeScript domain layer and Python services divide responsibility.
- Two plugin surfaces now exist by design: `platform/plugins` (the runtime) and the top-level `plugins/` (provider implementations the runtime loads).
