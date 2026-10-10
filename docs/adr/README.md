# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for Wisdum. An ADR captures a single architecturally significant decision: its context, the decision itself, and its consequences. Together they are the project's decision log — the "why" behind the codebase.

## When an ADR is required

Write an ADR **before implementing** any change that:

- adds, removes, or restructures a domain
- introduces or replaces a technology (database, framework, queue, provider)
- defines or changes a cross-cutting pattern (auth, eventing, multi-tenancy, plugin contracts)
- changes a public API contract or event schema in a breaking way
- meaningfully constrains future decisions

Bug fixes, refactors within a domain, and additive features that follow existing patterns do not need an ADR.

## Process

1. Copy [`0000-template.md`](0000-template.md) to `NNNN-short-slug.md`, using the next available number (zero-padded to four digits, kebab-case slug).
2. Fill in Context, Decision, and Consequences. Keep it honest — record the drawbacks, not just the benefits.
3. Open a pull request with status **Proposed**. Discussion happens on the PR.
4. On maintainer consensus, set the status to **Accepted** and merge. Implementation may then begin.
5. ADRs are immutable once accepted. If a decision changes, write a new ADR that **Supersedes** the old one, and mark the old one **Superseded by NNNN**.

## Statuses

| Status | Meaning |
| --- | --- |
| Proposed | Under discussion, not yet binding |
| Accepted | Decided; binding on implementation |
| Deprecated | No longer relevant (e.g., the component was removed) |
| Superseded by NNNN | Replaced by a later decision |

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-adopt-monorepo-structure.md) | Adopt a monorepo structure | Accepted |
| [0003](0003-core-technology-stack.md) | Core technology stack | Accepted; partially superseded by 0005, 0010, 0011, 0012 |
| [0004](0004-typescript-workspace-topology.md) | TypeScript workspace topology and package boundaries | Accepted |
| [0005](0005-core-runtime-language.md) | Core runtime language | Accepted |
| [0006](0006-kernel-architecture.md) | Kernel architecture | Accepted |
| [0007](0007-domain-driven-design.md) | Domain-Driven Design | Accepted |
| [0008](0008-application-infrastructure-kernel-layering.md) | Application, infrastructure, and kernel layering | Accepted |
| [0009](0009-postgresql-persistence-without-an-orm.md) | PostgreSQL persistence without an ORM | Accepted |
| [0010](0010-search-postgresql-full-text-and-pgvector.md) | Search on PostgreSQL full-text and pgvector | Accepted |
| [0011](0011-event-delivery-in-process-and-redis-pub-sub.md) | Event delivery: in-process and Redis Pub/Sub buses | Accepted |
| [0012](0012-http-api-fastify-bearer-auth-and-tenant-resolution.md) | HTTP API: Fastify, bearer tokens, and tenant resolution | Accepted; deficiencies mostly resolved by 0016 |
| [0013](0013-plugin-system-sdk-runtime-and-sandbox.md) | Plugin system: SDK, runtime, and sandbox | Accepted (partially implemented) |
| [0014](0014-ai-provider-abstraction.md) | AI provider abstraction | Accepted |
| [0015](0015-blob-storage-abstraction.md) | Blob storage abstraction | Accepted |
| [0016](0016-authentication-authorization-and-tenant-isolation.md) | Authentication, authorization, and tenant isolation | Accepted |

ADRs 0008 to 0015 were written retroactively on 2026-10-07 to record decisions that had already been implemented. They describe the code as it is, including gaps; each says so in its header. Keep this index up to date when adding ADRs.
