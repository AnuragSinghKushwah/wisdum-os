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
- Event and API schema changes here are contract changes — version them for backward compatibility.

No packages exist yet.
