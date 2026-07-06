# @wisdum/database

Vendor-neutral persistence contracts for the primary PostgreSQL datastore (ADR 0003). ORM/client selection is deferred to the first domain implementation.

| Directory | Contents |
| --- | --- |
| `schema/` | Authoritative schema documentation as domains land |
| `migrations/` | Versioned, reversible migrations (rollbacks are tested before merge) |
| `seed/` | Seed data for local development and tests |
| `src/` | Configuration and migration descriptor types |

## Boundaries

- Domains own their tables; this package owns connection and migration machinery.
- Every query in the platform is tenant-scoped — schema design must enforce it.
