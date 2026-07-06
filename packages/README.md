# packages/

Libraries shared across apps, services, and plugins. This is the only sanctioned way to share code — domains never import from each other (see [ADR 0002](../docs/adr/0002-adopt-monorepo-structure.md)).

## What belongs here

- Domain event schemas and their versioning
- Provider contracts implemented by `plugins/`
- API client libraries and shared types
- Cross-cutting utilities (careful: a "utils" dump is a design smell)

## Conventions

- One directory per package, self-contained with its own tests.
- A package may depend on other packages, never on `services/`, `apps/`, or `plugins/`.
- Every package exposes its public API through `src/index.ts` only — deep imports are lint-banned.
- Declared `dependencies` and `tsconfig.json` references stay in lockstep.
- Event and API schema changes here are contract changes — version them for backward compatibility.

## Packages

| Package | Purpose |
| --- | --- |
| [`types/`](types/) | Branded identifiers and the `Result` type |
| [`errors/`](errors/) | Platform error hierarchy |
| [`logger/`](logger/) | Structured logging contract + minimal console transport |
| [`config/`](config/) | Typed, fail-fast environment configuration |
| [`contracts/`](contracts/) | Shared interfaces: API envelopes, event contracts, plugin manifests |
| [`events/`](events/) | Runtime eventing interfaces (`Event`, `EventHandler`, `EventBus`) |
| [`domain/`](domain/) | Bounded contexts of the domain layer (placeholders) |
| [`database/`](database/) | Persistence contracts, schema/migrations/seed structure |

See [ADR 0004](../docs/adr/0004-typescript-workspace-topology.md) for the workspace topology.
