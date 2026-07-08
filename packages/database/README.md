# @wisdum/database

Persistence contracts and the connection/migration runtime for the primary
PostgreSQL datastore (ADR 0003) — a plain `pg` client, no ORM.

| Directory | Contents |
| --- | --- |
| `migrations/` | Versioned, reversible migrations, applied in filename order |
| `src/tables/` | Row-shape types mirroring each migration, for typed access at the query boundary |
| `src/` | `PgPool`/`withTransaction`, the migration runner (`migrateUp`/`migrateDown`), test support |

## Boundaries

- Domains own their tables; this package owns connection and migration machinery.
- Every query in the platform is tenant-scoped — schema design must enforce it.

## Integration tests

Files named `*.integration.test.ts` (here and in `packages/infrastructure`)
run against a real PostgreSQL instance instead of a fake. They read
`TEST_DATABASE_URL` and skip themselves entirely when it's unset, so the
normal unit test run (`npm test`) never requires a database.

To run them:

```sh
docker compose up -d postgres
TEST_DATABASE_URL=postgresql://wisdum:wisdum@localhost:5432/wisdum npm test
```

Use a dedicated database (not one with data you care about) — these
tests apply every migration and insert/delete rows directly.
