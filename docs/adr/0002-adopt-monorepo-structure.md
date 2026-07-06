# 0002 — Adopt a monorepo structure

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

Wisdum consists of multiple cooperating parts: user-facing applications, backend domain services, shared libraries, provider plugins, documentation, and tooling. These parts share contracts — event schemas, API types, domain models — that must evolve together. The project must choose between a single repository (monorepo) and one repository per component (polyrepo) before any code lands, because migrating later is expensive.

## Decision

We will develop Wisdum in a single repository with the following top-level layout:

| Directory | Contents |
| --- | --- |
| `product/` | Product strategy and planning |
| `docs/` | Architecture documentation, ADRs, domain models, API specs |
| `apps/` | User-facing applications |
| `packages/` | Libraries shared across apps and services |
| `services/` | Backend domain services, one directory per domain |
| `plugins/` | External provider integrations |
| `tools/` | Development and operations utilities |
| `examples/` | Example implementations |

Domain boundaries are enforced by convention and review rather than repository boundaries: services must not import from other services; shared code must be promoted to `packages/`.

## Consequences

- Cross-cutting changes (an event schema plus its producers and consumers) land atomically in one PR, keeping contracts consistent.
- One clone, one CI configuration, and one contribution workflow lower the barrier for new contributors.
- Documentation, product strategy, and code version together — a stated project value.
- Discipline is required to prevent the monorepo from becoming a monolith: domain isolation is not enforced by the repo layout itself, so review and (later) lint tooling must police cross-domain imports.
- CI must eventually become path-aware to avoid running every suite on every change as the platform grows.

## Alternatives considered

- **Polyrepo (repo per service/app):** stronger physical isolation, but shared-contract changes would require coordinated multi-repo releases — heavy machinery for a young project, and hostile to open-source contribution.
- **Hybrid (core monorepo + separate plugin repos):** plausible end-state once a plugin ecosystem exists; rejected as a starting point because official plugins benefit from versioning alongside the platform contracts they implement. A future ADR may extract community plugins.
