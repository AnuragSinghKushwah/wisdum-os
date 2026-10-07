# Domain: Knowledge

> Implemented in [`packages/domain/src/knowledge/`](../../packages/domain/src/knowledge/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

The canonical record of every knowledge asset on the platform. Knowledge is **not** the document itself — content lives behind content references, which today point at `Document` records (see [document.md](document.md)). This context owns the asset's metadata, source, processing state, version, labels, properties, and lifecycle.

## Entities

**Knowledge** (aggregate root) — identified by `KnowledgeId`, scoped to a tenant. Owns:

| State | Modelled as |
| --- | --- |
| Metadata | `KnowledgeTitle`, `KnowledgeSlug`, `KnowledgeDescription`, `KnowledgeLabel[]`, properties (a string-to-string map) |
| Kind | `KnowledgeType` (note, document, webpage, repository, pdf, markdown, image, video, audio, dataset, conversation) |
| Source | `KnowledgeSource` (manual, upload, url, integration; url requires a well-formed http(s) URI) |
| Content | `ContentReference[]` (an opaque reference plus an optional MIME type) |
| Lifecycle | `KnowledgeStatus` state machine |
| Revision | `KnowledgeVersion` (monotonic, starts at 1) |
| Access | `KnowledgeVisibility` (private, workspace, public) |

### Lifecycle state machine

```
draft ──────▶ importing ──▶ processing ──▶ active ◀──▶ archived
  │               │             │            │            │
  └───────────────┴─────────────┴────────────┴────────────┴──▶ deleted (terminal)

draft may also go directly to processing, active, or archived.
importing may also go directly to active.
active may re-enter processing (reprocessing).
archived can NEVER enter processing.
deleted is terminal: no transitions out.
```

### Behaviors

`Knowledge.create()` (starts in `draft`), `rename`, `updateDescription`, `changeVisibility`, `archive`, `restore`, `beginImport`, `completeImport`, `startProcessing`, `completeProcessing`, `markDeleted`, `addLabel`, `removeLabel`, `incrementVersion`, and `updateProperty`. Behaviors that would not change anything (same title, duplicate label, second `markDeleted`) are no-ops.

### Invariants (enforced inside the aggregate)

- Every state change goes through the transition map above; an illegal move throws `InvariantViolationError`.
- Archived knowledge cannot become processing.
- Deleted knowledge cannot change: every behavior except `markDeleted` (idempotent) and `updateProperty` (see Open questions) rejects it.
- Version only increases (`KnowledgeVersion.next()` is the only mutation path).
- Processing cannot complete unless it started; an import cannot complete unless the asset is `importing`.
- `restore` is only valid for archived knowledge.
- Every value object validates itself at construction (non-empty length-limited title, kebab-case slug, known type, status, and visibility, positive-integer version, well-formed MIME type).
- Slug **uniqueness** within a tenant is not an aggregate rule; `CreateKnowledgeHandler` makes the slug unique before creating.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `knowledge.asset.created` | `Knowledge.create()` |
| `knowledge.asset.updated` | `rename`, `updateDescription`, `restore`, `beginImport`, `addLabel`, `removeLabel`, `incrementVersion` (the payload's `change` field says which) |
| `knowledge.asset.archived` | `archive()` |
| `knowledge.asset.deleted` | `markDeleted()` |
| `knowledge.asset.imported` | `completeImport()` |
| `knowledge.asset.processing-started` | `startProcessing()` |
| `knowledge.asset.processing-completed` | `completeProcessing()` |
| `knowledge.asset.visibility-changed` | `changeVisibility()` |

Payloads carry primitives only (no value object classes). Events are recorded as `PendingDomainEvent`s: the domain generates no identifiers, and infrastructure assigns the event id at publication. `updateProperty` raises no event.

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createKnowledgeCommand`, `updateKnowledgeCommand`, `changeKnowledgeVisibilityCommand`, `importKnowledgeCommand`, `attachKnowledgeContentCommand`, `publishKnowledgeCommand`, `archiveKnowledgeCommand`, `deleteKnowledgeCommand`; queries `getKnowledgeQuery`, `listKnowledgeQuery`; the `KnowledgeReadModel` port. In [`packages/application/src/knowledge/`](../../packages/application/src/knowledge/).

## Specifications

`KnowledgeIsActive`, `KnowledgeIsPublic`, `KnowledgeCanBeArchived`, `KnowledgeCanBeDeleted`, and `KnowledgeIsProcessable`. The last three ask the status transition map, so they cannot disagree with the aggregate.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/knowledge` | Create a draft asset (slug derived from the title). |
| `GET` | `/v1/knowledge`, `/v1/knowledge/:id` | List and fetch assets. |
| `PATCH` | `/v1/knowledge/:id` | Rename, change the description, and add or remove labels. |
| `DELETE` | `/v1/knowledge/:id` | Mark the asset deleted. |
| `POST` | `/v1/knowledge/:id/visibility` | Change visibility. |
| `POST` | `/v1/knowledge/:id/import` | Begin and complete an import in one call. |
| `POST` | `/v1/knowledge/:id/content` | Attach content (a document id) and complete the import. |
| `POST` | `/v1/knowledge/:id/publish` | Restore an archived asset to active. |
| `POST` | `/v1/knowledge/:id/archive` | Archive the asset. |
| `POST` | `/v1/knowledge/upload` | Upload a PDF, text, or Markdown file: creates the asset and a `Document`, and attaches it. |
| `POST` | `/v1/webhooks/knowledge` | Ingest an asset from an external system (API-key authenticated). |

Details: [docs/api/knowledge.md](../api/knowledge.md) and [docs/api/webhooks.md](../api/webhooks.md). Routes are in `apps/api/src/routes/knowledge-routes.ts`.

## Persistence

`KnowledgeRepository` (`findById`, `findBySlug`, `exists`, `save`, `delete`) has PostgreSQL and in-memory implementations. Tables: `knowledge` (properties stored as `jsonb`), `knowledge_labels`, `knowledge_content_references` (migration `0005_create_knowledge`), with a unique slug per tenant.

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. Time enters exclusively through the `Clock` abstraction; UUID generation, persistence, and event transport are outside the domain.

## Open questions

- **`updateProperty` bypasses the aggregate's rules.** It writes into the properties map in place (casting away `readonly`), without the deleted-state guard, without updating `updatedAt`, and without raising an event. A deleted asset's properties can still change, and a property change is invisible to subscribers.
- **Processing statuses are simulated, not measured.** `AttachKnowledgeContentHandler` stores `parsingStatus`, `embeddingStatus`, `graphStatus`, and `processingError` as properties, and chooses them by searching the document text for words. Text containing "error", "fail", or "timeout" is marked as a failed parse with the canned message "Remote connection timed out"; "unembeddable" or "large_binary" marks embedding failed; "corrupted" or "malformed" marks graph construction failed. Any other content is recorded as fully completed regardless of what actually happened. Real pipeline results should replace this.
- **`publish` is a restore.** `POST /v1/knowledge/:id/publish` calls `restore()`, which only accepts archived assets, so it fails for a draft or active asset despite its name and the handler comment about an "initial publish".
- **Import does not import.** `ImportKnowledgeHandler` begins and completes the import in one step and, without a `sourceUri`, records a placeholder reference of the form `import://<id>`; nothing fetches the source.
- `KnowledgeLifecycleService` (slug availability) is declared in the domain but has no implementation and no caller; slug uniqueness is handled in `CreateKnowledgeHandler`.
- `startProcessing`, `completeProcessing`, `incrementVersion`, and content-reference mutation other than through import have no use case, so the `processing` state is currently unreachable through the API.
- Registration of these event types in `@wisdum/contracts` is still pending until the event transport settles.
