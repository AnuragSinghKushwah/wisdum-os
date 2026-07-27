# Changelog

All notable changes to Wisdum are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Application Layer Unit Test Backfill & Complete API Documentation Spec Expansion (`packages/application/src/*/handlers/__tests__/`, `docs/api/`).**
  - Added unit test suites for `ai`, `organization`, `search`, and `workspace` CQRS application handlers bringing application layer unit test coverage to 100% (229 unit tests passing).
  - Authored complete API markdown specifications covering all 14 Fastify route modules in `docs/api/` (`documents.md`, `identity.md`, `opportunities.md`, `graph.md`, `search.md`, `agents.md`, `reasoning.md`, `events.md`, `plugins.md`, `ai.md`, `organizations.md`, `workspaces.md`).
  - Updated `docs/api/README.md` index linking all REST and event specifications.
- **Sprint 015:** Plugin SDK & Dynamic Capability Provisioning Engine (`packages/plugin-sdk/`, `platform/plugins/src/manifest/`).

  - Created `@wisdum/plugin-sdk` workspace package exporting `defineWisdumPlugin()`, `WisdumPluginManifest` interface, and permission contracts (`read_content`, `publish_content`, `network_access`).
  - Implemented `PluginManifestValidator` in `platform/plugins/src/manifest/plugin-manifest-validator.ts` for automated plugin manifest specification, semver, and capability checking.
  - Added REST API validation endpoint `POST /v1/plugins/manifest/validate` in `apps/api/src/routes/plugin-routes.ts`.
- **Sprint 014:** Real-Time Event Streaming & SSE Engine (`apps/api/src/routes/event-routes.ts`, `apps/api/src/validation/event-schemas.ts`).

  - Added Server-Sent Events (SSE) streaming endpoint `GET /v1/events/stream` for real-time client event push updates.
  - Connected SSE response streams directly to `EVENT_BUS` domain event publications (`knowledge.asset.*`, `opportunity.*`, `agent.task.*`) with tenant boundary isolation.
  - Implemented automatic heartbeat pings and listener cleanup on client connection disconnect.
- **Sprint 013:** Automated Input Connectors & Integration Sync Engine (`platform/inputs/`, `packages/application/src/capture/`).

  - Added input connectors for external sources: GitHub, Notion, Slack, Email, Obsidian, AI Export.
  - Implemented `SyncInputConnectorHandler` application orchestrator folding captured items into Document deduplication and Knowledge creation pipelines.
  - Registered interval scheduler support in `platform/jobs/src/interval-scheduler.ts` for background connector sync.
- **Sprint 012:** Vector Store Semantic Indexing & Hybrid Search Engine (`packages/infrastructure/src/persistence/postgres/vector-store.postgres.ts`, `apps/api/src/routes/search-routes.ts`, `apps/web/src/app/(dashboard)/search/page.tsx`).
  - Added dense vector search using `PostgresVectorStore` with cosine similarity distance ranking (`0026_add_vector_store.up.sql`).
  - Implemented unified hybrid search (`GET /v1/search?q=...&mode=hybrid|semantic|keyword`) combining BM25 keyword matches with dense embedding search.
  - Upgraded Next.js Cognitive Search dashboard (`apps/web/src/app/(dashboard)/search/page.tsx`) with search mode toggle tabs, match percentage scoring, and asset preview drawer.
- **Sprint 011:** Analytics & Learning Engine Feedback Loop (`packages/application/src/opportunity/`, `packages/application/src/reasoning/`).
  - Added engagement and view-count analytics collection via `GetPublishedContentHandler` (Product Bible §11: Measure step).
  - Integrated historical performance metrics (average view counts per content type) into `RunReasoningPassHandler` to prioritize high-leverage content types during opportunity generation (Product Bible §11: Learn step).
- **Sprint 010:** Multi-Channel Publishing Engine & External Platform Sync (`platform/publishing/`, `packages/application/src/opportunity/`).
  - Implemented multi-platform publishing providers: `DevToPublishingProvider`, `GhostPublishingProvider`, `SubstackPublishingProvider`, `TwitterPublishingProvider`, `LinkedInPublishingProvider`, `WebsitePublishingProvider`.
  - Added `PublishContentDraftHandler` CQRS handler linking opportunity drafts to external multi-channel publishing targets.
- **Sprint 009:** Specialized Autonomous Agents & Background Automations Engine (`packages/domain/src/agent/`, `packages/application/src/agent/`, `apps/api/src/routes/agent-routes.ts`).
  - Added Agent aggregate lifecycle state machine: `AgentTask`, `AgentTaskId`, `AgentTaskRepository`, and task event publisher.
  - Implemented application handlers: `CreateAgentTaskHandler`, `ExecuteAgentTaskHandler`, `ListAgentTasksHandler`.
  - Registered Fastify endpoints `GET /v1/agents/tasks` and `POST /v1/agents/tasks`.
  - Added Vitest unit test suite `packages/application/src/agent/handlers/__tests__/agent-handlers.test.ts`.
- **Sprint 008:** Knowledge Graph Persistence & Multi-Layer Reasoning Engine (`packages/domain/src/graph/`, `packages/application/src/reasoning/`, `packages/infrastructure/src/read-models/postgres/`).
  - Extended `GraphReadModel` port with `getConcepts` and `getRelationships` methods.
  - Implemented `getConcepts` and `getRelationships` on `PostgresGraphReadModel` querying Postgres `concepts` and `concept_relationships` tables.
  - Registered `/v1/graph/concepts` and `/v1/graph/relationships` REST endpoints in `apps/api/src/routes/graph-routes.ts`.
  - Added unit test coverage for Graph topology read models in `get-graph-topology-handler.test.ts`.
- **Sprint 007:** Ingestion Engine & Public Webhook API (`packages/application/src/capture/` & `apps/api/src/routes/webhook-routes.ts`).
  - Added CQRS command & handler: `IngestWebhookCommand`, `IngestWebhookHandler` with content-hash deduplication and optional reasoning pass trigger.
  - Added Vitest unit test suite: `packages/application/src/capture/handlers/__tests__/ingest-webhook-handler.test.ts`.
  - Added Fastify public endpoint: `POST /v1/webhooks/ingest` with `x-api-key` validation and tenant context resolution.
  - Added body validation schemas in `apps/api/src/validation/webhook-schemas.ts`.
  - Updated DI container module: `CaptureModule` in `apps/api/src/container/modules/capture-module.ts` and `CAPTURE_HANDLERS` token in `apps/api/src/container/tokens.ts`.
  - Added Webhook Ingestion API specification in `docs/api/webhooks.md`.
- **Sprint 006:** Opportunity Engine Application Layer & HTTP Integration (`packages/application/src/opportunity/`).
  - CQRS commands & helper functions: `CreateOpportunityCommand`, `DismissOpportunityCommand`.
  - Application command handlers: `CreateOpportunityHandler`, `DismissOpportunityHandler`.
  - Unit test suite: Comprehensive Vitest handler tests (`packages/application/src/opportunity/handlers/__tests__/opportunity-handlers.test.ts`).
  - Refactored `POST /v1/opportunities` and added `POST /v1/opportunities/:id/dismiss` in `apps/api/src/routes/opportunity-routes.ts`.
- **Sprint 005:** Knowledge REST API Endpoints & Fastify Integration (`apps/api/src/routes/knowledge-routes.ts`).
  - Added REST API routes: `PATCH /v1/knowledge/:id`, `DELETE /v1/knowledge/:id`, `POST /v1/knowledge/:id/visibility`, `POST /v1/knowledge/:id/import`.
  - Added Fastify body validation schemas in `apps/api/src/validation/knowledge-schemas.ts`.
  - Updated DI container registrations in `apps/api/src/container/modules/knowledge-module.ts` and `apps/api/src/container/tokens.ts`.
  - Documented Knowledge REST API specification in `docs/api/knowledge.md`.
- **Sprint 004:** Knowledge Application Layer (`packages/application/src/knowledge/`).
  - CQRS commands and helper functions: `UpdateKnowledgeCommand`, `DeleteKnowledgeCommand`, `ChangeKnowledgeVisibilityCommand`, `ImportKnowledgeCommand`.
  - Application command handlers: `UpdateKnowledgeHandler`, `DeleteKnowledgeHandler`, `ChangeKnowledgeVisibilityHandler`, `ImportKnowledgeHandler`.
  - Unit test suite: Comprehensive Vitest handler tests (`packages/application/src/knowledge/handlers/__tests__/knowledge-handlers.test.ts`).
- **Sprint 003:** Knowledge bounded context (`packages/domain/src/knowledge/`).
  - `Knowledge` aggregate root: lifecycle state machine (draft/importing/processing/active/archived/deleted), invariant enforcement, domain event recording.
  - Self-validating value objects: `KnowledgeId`, `KnowledgeTitle`, `KnowledgeSlug`, `KnowledgeDescription`, `KnowledgeType`, `KnowledgeStatus`, `KnowledgeVisibility`, `KnowledgeSource`, `KnowledgeVersion`, `KnowledgeLabel`, `ContentReference`.
  - Domain events: created, updated, archived, deleted, imported, processing-started, processing-completed, visibility-changed (`knowledge.asset.*`).
  - Ports: `KnowledgeRepository` and `KnowledgeLifecycleService` (interfaces only).
  - Specifications: `KnowledgeIsActive`, `KnowledgeIsPublic`, `KnowledgeCanBeArchived`, `KnowledgeCanBeDeleted`, `KnowledgeIsProcessable`.
  - Shared primitives fixed: `PendingDomainEvent` (domain events carry no `eventId` until publication), `eventType` discriminator on `DomainEvent`, `Identifier` brand made truly nominal.
  - Domain documentation: `docs/domains/knowledge.md`.
- **Sprint 002:** Domain-Driven Design foundation.
  - Tactical DDD primitives in `packages/domain/src/shared/`: `Entity<TId>`, `AggregateRoot<TId>`, `ValueObject<T>`, `Identifier<TBrand>`, `DomainEvent<T>`, `Repository<T>`, `DomainService`, `Specification<T>`, `Clock` and `SystemClock`.
  - Extended `packages/types` with `Option<T>`, `Maybe<T>`, `Either<L,R>`.
  - Extended `packages/errors` with `DomainError`, `ValidationError`, `InvariantViolationError`.
  - Added generic-only contracts to `packages/contracts/src/shared/`: `Searchable`, `Versioned`, `SoftDeletable`, `BulkOperationResult<T>`.
  - ADR 0005: Core runtime language (TypeScript for domain, Python reserved for ML/AI/OCR).
  - ADR 0006: Kernel architecture (future `packages/kernel` with identity, multi-tenancy, persistence, events, caching, plugins).
  - ADR 0007: Domain-Driven Design (entities, aggregates, value objects, domain events, repositories, domain services, specifications).
- **Sprint 001:** Production monorepo workspace.
  - npm workspaces + TypeScript project references building from the root (`build`, `typecheck`, `lint`, `format`, `test`).
  - Shared packages: `types`, `errors`, `logger`, `config`, `contracts`, `events`, `domain`, `database` — public APIs via `src/index.ts` only.
  - Platform capability scaffolds under `platform/`: `auth`, `ai`, `plugins`, `search`, `storage`, `jobs`.
  - App composition roots: `apps/web`, `apps/api` (bootstrap placeholders).
  - CI workflow validating install, typecheck, build, and lint on every push/PR.
  - ADR 0004: TypeScript workspace topology and package boundaries.
- Repository skeleton: `product/`, `docs/`, `apps/`, `packages/`, `services/`, `plugins/`, `tools/`, `examples/`.
- Foundational documentation: README, architecture overview, domain and API documentation structure.
- Architecture Decision Record (ADR) process with founding decisions (ADR 0001–0003).
- Contribution files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, GOVERNANCE, issue and PR templates.
- Apache License 2.0.
