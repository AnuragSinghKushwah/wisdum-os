# 0008 — Application, infrastructure, and kernel layering

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `dad8b3d` (Sprint 004). Rationale is reconstructed from the code and history.

## Context

[ADR 0004](0004-typescript-workspace-topology.md) fixed the workspace topology, and [ADR 0007](0007-domain-driven-design.md) put business rules in `packages/domain` with persistence outside it. Neither said where use cases, adapters, and wiring live, and [ADR 0006](0006-kernel-architecture.md) described a future `packages/kernel` only in outline. Wiring the first real API required all three decisions at once.

## Decision

The domain is surrounded by three further layers, each a workspace package:

- **`packages/application`** holds use cases as command/query handlers, one directory per bounded context: `<context>/{commands,queries,handlers,dto,ports}`. A handler loads aggregates through domain repository interfaces, calls aggregate behavior, persists, then publishes the events pulled from the aggregate through the `DomainEventPublisher` port. Outbound ports shared by all contexts (`IdGenerator`, `SlugGenerator`, `DomainEventPublisher`, `LlmCompletionPort`) live in `application/src/shared/ports.ts`.
- **`packages/infrastructure`** implements the domain repository interfaces and the application ports: PostgreSQL and in-memory repositories, id and slug generators, JWT and password hashing, the event buses, and the search provider.
- **`packages/kernel`** provides a reflection-free dependency-injection container (typed tokens; `singleton`, `scoped`, and `transient` lifetimes; circular-dependency detection), the `KernelModule` contract (`register`, `start`, `stop`), dependency-ordered startup with reverse-order shutdown, a health registry, shutdown hooks, a capability registry, and the plugin lifecycle types. No decorators or metadata emit.
- **Composition** happens only in `apps/api/src/container`: one `*-module.ts` per context registers its handlers and adapters, and `CoreModule` registers the shared singletons. `CoreModule` chooses adapters from the environment: PostgreSQL when `DATABASE_URL` is set, the Redis event bus when `REDIS_URL` is set, and in-memory adapters otherwise.

Intended dependency direction: `apps` → `application`, `infrastructure`, `platform`, `kernel` → `domain` → `types`/`errors`. `apps/web` depends on no workspace package; it is a client of the HTTP API.

## Consequences

- The domain stays portable and handlers are testable with in-memory adapters, so the application layer has unit tests without a database.
- Each use case costs a command or query, a handler, and often a DTO. This ceremony is deliberate: it keeps the API routes thin.
- Every repository exists twice, in PostgreSQL and in memory. The two must stay behaviorally aligned, and only some repositories have integration tests against real PostgreSQL to catch drift.
- The DI tokens are centralized in `apps/api/src/container/tokens.ts`, which will keep growing with the number of contexts.
- **The intended rule is not fully met today.** `application/src/shared/ports.ts` states that the application layer never depends on a `platform/*` package, but `packages/application` currently depends on `platform-publishing`, `platform-inputs`, and `platform-search`. Separately, `platform/search` depends on `platform/ai`, although `platform/README.md` says capabilities do not depend on each other. These should either be removed behind ports or the rule should be relaxed by a new ADR.
- **Apps are not purely composition layers yet.** Two route files hold business logic and SQL: tenant creation (organization, workspace, and membership rows) is raw SQL in `apps/api/src/bootstrap/provision-tenant.ts`, shared by `onboarding/setup` and the development seed, and `search-routes.ts` runs its own `ILIKE` queries and merges scores for `GET /v1/search`. Both should move behind application handlers and ports.
- The implemented kernel is narrower than ADR 0006's outline. Identity, persistence, and event transport live in `infrastructure`, `database`, and `apps/api` rather than in the kernel. ADR 0006 remains a direction, not a description of what exists.

## Alternatives considered

- **Handlers inside the domain package.** Rejected: use cases need ports for IDs, time of publication, and external services, which would pull infrastructure concerns into the domain.
- **A decorator-based DI framework.** Rejected: it adds reflection and build-tool requirements, and the container is under 150 lines.
- **Services-per-context packages under `services/`.** Not taken; the workspace layout of [ADR 0004](0004-typescript-workspace-topology.md) put these layers in `packages/` instead.
