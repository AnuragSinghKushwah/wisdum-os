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
| [0003](0003-core-technology-stack.md) | Core technology stack | Accepted |

Keep this index up to date when adding ADRs.
