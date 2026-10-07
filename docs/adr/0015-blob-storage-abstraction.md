# 0015 — Blob storage abstraction

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `4cc65cf` (Sprint 009). Rationale is reconstructed from the code and history.

## Context

[ADR 0003](0003-core-technology-stack.md) specifies S3-compatible object storage for media and files, and the platform must run self-hosted without a cloud account. Knowledge records hold only references to content ([docs/domains/knowledge.md](../domains/knowledge.md)), so the bytes need a home behind a stable interface.

## Decision

`platform/storage` defines a `BlobStorage` port with three adapters: a filesystem backend for local and single-node use, an S3-compatible backend (AWS S3 and self-hosted MinIO), and an in-memory backend for tests. The package also contains the object, version, artifact, and attachment modules that build on the port. Callers depend on the port and the backend is chosen in the composition root.

## Consequences

- Self-hosted deployments can store content on disk or in MinIO, and cloud deployments in S3, without code changes.
- **It is not wired into the API yet.** `apps/api` does not depend on `@wisdum/platform-storage`. The upload endpoint (`POST /v1/knowledge/upload`) extracts text from the file (PDFs through `pdf-parse`), stores that text as a `Document` record in PostgreSQL, and attaches the document id to the knowledge asset as its content reference. The original file is discarded, so binary content (images, audio, video, and the PDF itself) is not retained anywhere.
- Before `image`, `video`, `audio`, and original-file knowledge types are real, a backend must be registered in the composition root, configured through environment variables, and used on upload. That work should also settle retention and deletion of blobs when knowledge is deleted.

## Alternatives considered

- **Storing all content in PostgreSQL.** What the upload path effectively does for extracted text today; it is simple but would inflate the primary datastore and complicate backups for large media.
- **A single hard-wired S3 client.** Rejected: it would force a cloud dependency on self-hosters.
