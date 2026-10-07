# Domain Models

One document per domain. A domain's documentation is its contract with the rest of the platform: what it owns, what it emits, and what it consumes. Update the document in the same PR as any change to the domain's entities, events, or API surface.

## Bounded contexts

| Context | Scope | Document |
| --- | --- | --- |
| Agent | Background tasks run by autonomous agents | [agent.md](agent.md) |
| AI | Providers, models, prompt templates, and conversations | [ai.md](ai.md) |
| Document | Raw content, its type, hash, and revisions | [document.md](document.md) |
| Graph | Concepts, mentions, and relationships between concepts | [graph.md](graph.md) |
| Identity | Users, roles, permissions, API keys, and service accounts | [identity.md](identity.md) |
| Knowledge | The canonical record of each knowledge asset | [knowledge.md](knowledge.md) |
| Opportunity | Insights, opportunities, content drafts, and published content | [opportunity.md](opportunity.md) |
| Organization | Accounts that group workspaces, with policies and branding | [organization.md](organization.md) |
| Plugin | Installed plugins and their lifecycle | [plugin.md](plugin.md) |
| Search | Search indexes, indexed sources, and ranking policy | [search.md](search.md) |
| Workspace | Collaboration spaces, members, settings, and limits | [workspace.md](workspace.md) |

The documents describe what the code does today. Each ends with an "Open questions" section listing real gaps, such as behaviors that exist in the domain but have no use case, so read it before building on a context.

## Document template

Each domain document (`<domain-name>.md`) covers:

```markdown
# Domain: <name>

## Purpose
What this domain owns and why it exists as a boundary.

## Entities
Aggregate roots, owned entities, and the value objects that matter.
Include the lifecycle (for aggregates with a status), the behaviors, and
the invariants the aggregate enforces.

## Events
### Published
| Event | Raised by |
### Consumed
Events this domain reacts to.

## Use cases
Commands, queries, and ports in packages/application.

## Specifications
Named rules exposed for reuse.

## API surface
Endpoints this domain exposes (link to docs/api/).

## Persistence
Repository ports and the tables behind them.

## Dependencies
What the domain package imports. Domains never depend on other domains directly.

## Open questions
Real gaps you can point to in the code. No speculation.
```

## Rules

- A domain that needs another domain's data listens to its events or calls its public API — never its internals.
- Entity invariants belong to exactly one domain. If two documents describe the same invariant, the boundaries are wrong.
- New domains require an ADR establishing the boundary before implementation.
- Every event name, state, and method in a document must exist in the code. Event names come from the constants in `packages/domain/src/<context>/events/`.
