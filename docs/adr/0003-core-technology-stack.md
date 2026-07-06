# 0003 — Core technology stack

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer

## Context

Wisdum needs a foundational technology stack before any implementation begins. The choice is constrained by the platform's design principles: API-first, domain-driven, event-driven, plugin-based, AI-native, self-hostable, and multi-tenant. Because Wisdum is open source and meant to be self-hosted by organizations of varying sophistication, the stack must be composed of mature, widely known, permissively licensed components with strong communities — exotic technology raises the barrier to both contribution and adoption.

## Decision

We will build on the following stack:

| Concern | Choice | Rationale |
| --- | --- | --- |
| Backend framework | FastAPI (Python 3.11+, async-first) | First-class OpenAPI generation supports API-first design; async I/O fits an event-driven platform; Python is the lingua franca of the AI ecosystem the platform integrates with |
| Frontend | Next.js with React and TypeScript, Tailwind CSS | Mature ecosystem; TypeScript end-to-end on the client; the UI remains one consumer of the platform APIs |
| Primary datastore | PostgreSQL 14+ | Reliable relational core for domain data; JSONB for flexible knowledge structures; ubiquitous in self-hosted deployments |
| Cache & task queues | Redis + Celery | Proven combination for distributed background processing and caching |
| Full-text search | Meilisearch | Open source and self-hostable, replaceable behind a search-provider abstraction |
| Media & file storage | S3-compatible object storage | Works with cloud providers and self-hosted MinIO alike |

Cross-cutting patterns: repository pattern for data access, dependency injection for testability, domain events (`[domain].[entity].[action]`) for inter-domain communication, and provider plugins for all external services (AI, auth, search, storage, publishing, analytics) so the core stays vendor-independent.

## Consequences

- Contributors need competence in two languages (Python and TypeScript); the trade-off buys the best ecosystem for each side of the platform.
- Every component is self-hostable, keeping the open-source promise credible; no feature may take a hard dependency on a proprietary managed service.
- Search and storage sit behind provider abstractions, so Meilisearch and S3 are defaults, not lock-ins.
- Async-first Python demands care with blocking libraries; reviews must watch for synchronous I/O in request and event paths.
- Multi-tenancy must be designed into the PostgreSQL schema and every domain from the start; retrofitting it is prohibitively expensive.

## Alternatives considered

- **Node.js/NestJS backend (single-language stack):** rejected because the AI ecosystem Wisdum builds on is Python-centric, and FastAPI's OpenAPI support is stronger out of the box.
- **Django:** batteries-included but ORM-centric and synchronous by heritage; poorer fit for async, event-driven, DDD-shaped services.
- **Elasticsearch:** heavier operational footprint for self-hosters than Meilisearch; the search-provider plugin keeps it available as an alternative.
- **Kafka for eventing:** durable event streaming may be justified at scale; Redis/Celery is sufficient now, and the event abstraction leaves room for a future ADR to introduce a broker.
