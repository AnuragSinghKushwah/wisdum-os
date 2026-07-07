# 0006 — Kernel architecture

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

The Wisdum platform will eventually run on two layers: a "user kernel" (the main application running on the platform) and a "system kernel" providing foundational capabilities (identity, multi-tenancy, plugin lifecycle, event delivery, persistence, caching).

This ADR reserves the structure and decision-making framework for that kernel layer without implementing it.

## Decision

A future package `packages/kernel` will encapsulate foundational platform capabilities that transcend bounded contexts:

| Subsystem | Responsibility |
| --- | --- |
| Identity | Actor authentication, session management, token lifecycle |
| Multi-tenancy | Tenant isolation, request scoping, row-level security |
| Persistence | Database initialization, connection pooling, transaction coordination |
| Events | Event bus transport, store-and-forward reliability, replay |
| Caching | In-process and distributed caching, invalidation |
| Observability | Structured logging, tracing, metrics |
| Plugins | Plugin registration, discovery, lifecycle, contract enforcement |

Each subsystem is a module under `packages/kernel/src/` with a stable API that only the application layer consumes — domains are agnostic of kernel implementation details.

The kernel lives in TypeScript (per ADR 0005) and runs in the same process as the domain — no inter-process boundaries.

Concrete implementations (PostgreSQL driver, Redis client, event transports) are deferred to when domain code lands and dependencies become clear. The kernel API is stable; implementations are replaceable.

## Consequences

- The workspace avoids monolithic god packages while keeping clear architectural layers.
- Each kernel subsystem has a single clear responsibility.
- Domains depend on kernel APIs only, not their implementations.
- The kernel grows alongside domains; subsystems are added as needed, not speculatively.
- Testing each domain in isolation becomes possible: kernel implementations are mockable behind stable interfaces.

## Alternatives considered

- **No separate kernel; everything in packages/domain.** Rejected: domain code and infrastructure concern tangle; domains lose portability.
- **Separate `packages/infrastructure`.** Rejected: "infrastructure" is too vague; the kernel framing is clearer — these are foundational platform capabilities, not infrastructure tooling.
