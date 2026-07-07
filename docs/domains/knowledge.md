# Domain: Knowledge

> Implemented in [`packages/domain/src/knowledge/`](../../packages/domain/src/knowledge/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). Pure domain model — no APIs, persistence, or infrastructure yet.

## Purpose

The canonical record of every knowledge asset on the platform. Knowledge is **not** the document itself — content lives behind content references resolved by the storage capability. This context owns the asset's metadata, source, processing state, version, labels, properties, and lifecycle.

## Entities

**Knowledge** (aggregate root) — identified by `KnowledgeId`, scoped to a tenant. Owns:

| State | Modelled as |
| --- | --- |
| Metadata | `KnowledgeTitle`, `KnowledgeSlug`, `KnowledgeDescription`, `KnowledgeLabel[]`, properties |
| Kind | `KnowledgeType` (note, document, webpage, repository, pdf, markdown, image, video, audio, dataset, conversation) |
| Source | `KnowledgeSource` (manual, upload, url, integration; url requires a well-formed URI) |
| Content | `ContentReference[]` (opaque storage pointers + MIME type) |
| Lifecycle | `KnowledgeStatus` state machine |
| Revision | `KnowledgeVersion` (monotonic, starts at 1) |
| Access | `KnowledgeVisibility` (private, workspace, public) |

### Lifecycle state machine

```
draft ──────▶ importing ──▶ processing ──▶ active ◀──▶ archived
  │               │             │            │            │
  └───────────────┴─────────────┴────────────┴────────────┴──▶ deleted (terminal)

draft may also go directly to processing, active, or archived.
active may re-enter processing (reprocessing).
archived can NEVER enter processing.
deleted is terminal — no transitions out, no mutations.
```

### Invariants (enforced inside the aggregate)

- Title is never empty; every value object validates itself at construction.
- Archived knowledge cannot become processing (transition map).
- Deleted knowledge cannot change (every behavior guards; `markDeleted` is idempotent).
- Version only increases (`KnowledgeVersion.next()` is the only mutation path).
- Processing cannot complete unless started; import cannot complete unless started.
- Visibility always holds a validated value.
- Slug shape is validated in the VO; slug **uniqueness** is a repository concern (`KnowledgeLifecycleService.isSlugAvailable`).

## Events

### Published

| Event | Trigger |
| --- | --- |
| `knowledge.asset.created` | `Knowledge.create()` |
| `knowledge.asset.updated` | rename, description, labels, version bump, restore, import start |
| `knowledge.asset.archived` | `archive()` |
| `knowledge.asset.deleted` | `markDeleted()` |
| `knowledge.asset.imported` | `completeImport()` |
| `knowledge.asset.processing-started` | `startProcessing()` |
| `knowledge.asset.processing-completed` | `completeProcessing()` |
| `knowledge.asset.visibility-changed` | `changeVisibility()` |

Payloads carry primitives only (no value object classes). Events are recorded as `PendingDomainEvent`s — the domain generates no identifiers; infrastructure assigns `eventId` at publication.

### Consumed

None.

## API surface

None yet — this context has no routes or transport. Ports: `KnowledgeRepository` (findById, findBySlug, exists, save, delete) and `KnowledgeLifecycleService` (slug availability), both interface-only.

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared DDD primitives. Time enters exclusively through the `Clock` abstraction; UUID generation, persistence, and event transport are outside the domain.

## Open questions

- Workspace linkage: `visibility: 'workspace'` implies a relationship to the (future) workspace context — reference by ID once that context exists.
- Property and content-reference mutation behaviors (currently set at creation/import only).
- Registration of these event types in `@wisdum/contracts` once the event transport lands.
