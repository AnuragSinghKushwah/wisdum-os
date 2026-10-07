# 0009 — PostgreSQL persistence without an ORM

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `832ed9e` (Sprint 005) and extended through migration 0027. Rationale is reconstructed from the code and history.

## Context

[ADR 0003](0003-core-technology-stack.md) chose PostgreSQL as the primary datastore, and [ADR 0007](0007-domain-driven-design.md) requires persistence to stay outside the domain. `packages/database` explicitly deferred the choice of ORM or client library to the first domain implementation. Sprint 005 was that implementation, for every aggregate then in existence.

## Decision

- **Direct `pg` access, no ORM.** PostgreSQL repositories (`packages/infrastructure/src/persistence/postgres/*.postgres.ts`) write SQL by hand and map rows to aggregates through each aggregate's `reconstitute(snapshot)`. Row shapes are typed in `packages/database/src/tables`.
- **Schema is an ordered series of SQL migrations** in `packages/database/migrations`, named `NNNN_name.up.sql` with a matching `NNNN_name.down.sql` (27 as of this record). `migrateUp` applies pending migrations in filename order and records them in a `schema_migrations` table. A session-level advisory lock serializes concurrent migrators, so replicas starting together cannot apply the same migration twice.
- **Migrations run at startup.** `CoreModule` calls `migrateUp` on start when `DATABASE_URL` is set, and the production container entrypoint (`tools/docker/entrypoint-api.sh`) also runs `migrate.js up` beforehand; the advisory lock makes the double run harmless.
- **The application owns identifiers and timestamps.** Migrations never default primary keys or timestamps; values come from the application's `IdGenerator` and `Clock`.
- **Aggregate-root tables carry `tenant_id`** (23 tables), and queries filter by it. Child tables such as `workspace_members` and `knowledge_labels` (12 tables) have no tenant column and inherit tenancy through their parent row.
- **Every repository interface has a PostgreSQL adapter and an in-memory adapter**, selected in the composition root ([ADR 0008](0008-application-infrastructure-kernel-layering.md)). Integration tests run against a real PostgreSQL instance (`c370558`).

## Consequences

- SQL is explicit and reviewable, and aggregates stay free of persistence annotations.
- Each aggregate needs hand-written mapping between row, snapshot, and aggregate. Drift between SQL, row types, and snapshots is caught only by tests.
- **Rollback is untested.** Every up migration has a down script, but `migrateDown` is not called by any automated test, contrary to the project rule that rollback scripts are tested before merge. This gap should be closed with a migrate-up/migrate-down round-trip test.
- **Tenant isolation is by convention.** Nothing in the database enforces the `tenant_id` filter; a repository that omits it would leak across tenants. The two search storage tables, `search_provider_documents` and `vector_records`, have no tenant column at all, so isolation there depends on index names such as `knowledge:<tenantId>`. Row-level security is a possible hardening step.
- A migration that fails or runs long blocks API startup on every replica.

## Alternatives considered

- **An ORM or query builder (Prisma, Drizzle, TypeORM, Kysely).** Not taken: the aggregate shape, not a table shape, is the persistence model, and an ORM's entity model competes with the domain's.
- **Alembic.** Named in the project conventions but Python-only; it stopped being applicable once [ADR 0005](0005-core-runtime-language.md) fixed TypeScript as the core language.
