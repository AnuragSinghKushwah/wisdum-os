# @wisdum/domain

Home of the platform's bounded contexts. Core business logic will reside here; apps compose it, never reimplement it.

| Context | Scope |
| --- | --- |
| `identity/` | Actors on the platform and their tenant memberships |
| `workspace/` | Tenant workspaces — the container for knowledge work |
| `knowledge/` | Knowledge assets and the connections between them |
| `plugin/` | Registered plugins and their lifecycle state |
| `ai/` | AI-assisted workflows and their execution state |
| `search/` | Search indexing state and query orchestration |
| `shared/` | Cross-context primitives (`DomainDescriptor`) |

Currently placeholder exports only — each context ships with its own ADR and design doc in `docs/domains/` before real logic lands.

## Boundaries

- Contexts do not import from each other; they communicate through `@wisdum/events`.
- No I/O, no framework types, no provider SDKs.
