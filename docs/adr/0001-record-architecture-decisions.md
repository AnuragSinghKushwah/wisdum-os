# 0001 — Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

Wisdum aims to become reference infrastructure for knowledge operations: a long-lived, open-source platform expected to outgrow any single contributor's memory. Architectural decisions made early (domain boundaries, technology choices, event contracts, plugin interfaces) will constrain the project for years. Without a written record, the rationale behind those decisions erodes, new contributors re-litigate settled questions, and accidental architecture accumulates.

## Decision

We will record every architecturally significant decision as an Architecture Decision Record (ADR) in `docs/adr/`, using the format `NNNN-slug.md` and the template in `0000-template.md`. Each ADR states its Context, Decision, and Consequences. ADRs are proposed via pull request, accepted by maintainer consensus, and immutable once accepted — later reversals are expressed as new, superseding ADRs. No architectural change may be implemented without an accepted ADR.

## Consequences

- The rationale behind the architecture is discoverable by every contributor, present and future.
- Architectural discussion happens in reviewable, asynchronous form rather than in chat threads or nowhere.
- Proposing architectural change carries a small documentation cost; this is intentional friction that filters out casual architectural churn.
- Maintainers must enforce the requirement during review, or the log silently loses authority.
