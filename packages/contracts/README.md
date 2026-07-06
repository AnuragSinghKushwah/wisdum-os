# @wisdum/contracts

Interfaces and exported types only — no implementations, no runtime logic beyond type definitions.

| Module | Contents |
| --- | --- |
| `api/` | REST envelopes mirroring `docs/api/README.md` (error body, cursor pagination) |
| `events/` | Event naming (`[domain].[entity].[action]`) and versioning contracts |
| `plugin/` | Plugin manifest and provider categories |
| `shared/` | Cross-cutting markers (identified, tenant-scoped, timestamped, platform capability) |

## Boundaries

- Depends on `@wisdum/types` only.
- Runtime event interfaces live in `@wisdum/events`; this package holds the wire-level contracts.
