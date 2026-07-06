# Domain Models

One document per domain. A domain's documentation is its contract with the rest of the platform: what it owns, what it emits, and what it consumes. Update the document in the same PR as any change to the domain's entities, events, or API surface.

No domains are implemented yet — the first domain designs will land here alongside their ADRs.

## Document template

Each domain document (`<domain-name>.md`) covers:

```markdown
# Domain: <name>

## Purpose
What this domain owns and why it exists as a boundary.

## Entities
Core entities and their invariants (not database schemas — concepts).

## Events
### Published
| Event | Trigger | Schema |
### Consumed
| Event | Reaction |

## API surface
Endpoints this domain exposes (link to OpenAPI spec in docs/api/).

## Dependencies
Provider contracts used (search, storage, AI, ...). Domains never depend on other domains directly.

## Open questions
```

## Rules

- A domain that needs another domain's data listens to its events or calls its public API — never its internals.
- Entity invariants belong to exactly one domain. If two documents describe the same invariant, the boundaries are wrong.
- New domains require an ADR establishing the boundary before implementation.
