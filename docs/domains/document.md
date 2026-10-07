# Domain: Document

> Implemented in [`packages/domain/src/document/`](../../packages/domain/src/document/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

Holds the raw content that knowledge assets point to. A document is an immutable-by-revision body of text (or base64-carried bytes) with its media type, encoding, size, language, and integrity hash. Knowledge records reference documents through content references; the document owns the bytes' metadata and lifecycle.

## Entities

**Document** (aggregate root) — identified by `DocumentId`, scoped to a tenant.

| State | Modelled as |
| --- | --- |
| Content | `DocumentContent` (inline text, at most 10,000,000 characters; larger payloads belong in blob storage) |
| Type | `MimeType` (lowercase IANA media type, parameters excluded) and `ContentEncoding` (`utf-8`, `utf-16le`, `ascii`, `latin1`, `base64`) |
| Integrity | `ContentHash` (`sha-256`, `sha-512`, or `blake3`; lowercase hex of the right length) and `ByteSize` |
| Language | `LanguageCode` (BCP-47 shape; "undetermined" until detected) |
| Lifecycle | `DocumentStatus` |

### Lifecycle

```
active ──▶ superseded ──▶ deleted
   └──────────────────────▶ deleted
```

`active` is the live revision. `superseded` means a newer document replaced it. `deleted` is terminal. Only `active` documents can change; superseded and deleted ones are frozen.

### Invariants

- Empty content cannot report a non-zero size.
- Hash, size, and encoding always change together with the content (`replaceContent` sets all four at once).
- Replacing content with an identical hash is a no-op.
- A document cannot supersede itself.
- Superseded and deleted documents cannot be modified.
- Status changes follow the transition map above. `markDeleted()` is idempotent.
- Each value object validates itself at construction (UUID shape, non-negative safe-integer size, digest length per algorithm, well-formed MIME type and language tag).

## Events

### Published

| Event | Raised by |
| --- | --- |
| `document.content.created` | `Document.create()` |
| `document.content.replaced` | `replaceContent()` |
| `document.content.language-detected` | `detectLanguage()` |
| `document.content.superseded` | `supersede()` |
| `document.content.deleted` | `markDeleted()` |

Payloads carry primitives: for example `replaced` carries the previous and new hash, the size, and the encoding; `superseded` carries the id of the replacing document.

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `createDocumentCommand` and `replaceDocumentContentCommand`, query `getDocumentQuery`, in [`packages/application/src/document/`](../../packages/application/src/document/). The ports `ContentHasher` (the domain never computes a hash) and `DocumentReadModel` live there too.

`CreateDocumentHandler` pre-processes JSON chat exports into Markdown, hashes the content, and **deduplicates by content hash per tenant**: if a document with the same hash exists, it returns that document's id instead of creating a new one.

## Specifications

`DocumentIsActive`, `DocumentIsEmpty`, `DocumentIsTextual` (MIME primary type is `text`), `DocumentExceedsSize` (takes a limit), `DocumentNeedsLanguageDetection` (language still undetermined), `DocumentCanBeDeleted` (status allows the deleted transition).

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/documents` | Create a document (deduplicated by content hash). |
| `GET` | `/v1/documents/:id` | Fetch a document. |
| `PUT` | `/v1/documents/:id/content` | Replace the content. |

Details and examples: [docs/api/documents.md](../api/documents.md). Routes are in `apps/api/src/routes/document-routes.ts`.

## Persistence

`DocumentRepository` (`findById`, `findByContentHash`, `exists`, `save`, `delete`) has PostgreSQL and in-memory implementations. Table: `documents` (migration `0006_create_documents`), with uniqueness on `(tenant_id, content_hash_algorithm, content_hash_digest)`.

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. Hashing and language detection are infrastructure concerns behind ports; the domain only stores their results.

## Open questions

- `supersede()` is implemented but no application handler or route calls it, so the `superseded` state is currently unreachable through the API.
- `detectLanguage()` has no caller outside tests; no use case assigns a language after creation.
- The repository exposes `exists` and the domain exposes `DocumentIsEmpty` and `DocumentExceedsSize`, but no handler uses them to enforce quota or size policy; limits are described as a workspace concern.
