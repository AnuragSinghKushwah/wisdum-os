# Changelog

All notable changes to Wisdum are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Authentication, authorization, and tenant isolation** ([ADR 0016](docs/adr/0016-authentication-authorization-and-tenant-isolation.md)):
  - Every endpoint now requires a credential unless it is explicitly public (nine routes, pinned by a test), and each has a permission requirement in `apps/api/src/security/route-permissions.ts`; a route missing from that table is refused. A completeness test checks the table against the registered routes.
  - Permission catalog, `PermissionSet`, and four system roles (`owner`, `admin`, `member`, `viewer`) in `@wisdum/domain`; `AccessPolicy` derives per-tenant role ids so no role rows are needed. Assigning a role or minting an API key cannot exceed what the caller holds.
  - API keys now authenticate: `x-api-key: w_sk_…` or `Authorization: Bearer w_sk_…`, scoped, tenant-bound, and revocable. `GET /v1/identity/roles` lists a tenant's roles. Webhook ingestion needs a key with the `capture:ingest` scope.
  - `403 authorization_error` response, and `AuthorizationError`.
  - `WISDUM_ALLOW_SIGNUP` (sign-up is closed once a tenant exists) and `WISDUM_DEV_SEED` / `NEXT_PUBLIC_WISDUM_DEV_SEED` (a development account and the web "Quick Dev Sign In", refused in production).
  - `tools/grant-system-role` to give users created before roles were enforced a role.
  - Tests: access policy, API key handlers, auth hook, secret resolution, route policy completeness, tenant isolation (two real tenants), and role/key escalation. The suite grows from 242 to 402 passing tests.
- ADRs 0008 to 0015 recording decisions already implemented since ADR 0007: layering, PostgreSQL persistence, search, event delivery, the HTTP API and authentication, the plugin system, AI providers, and blob storage. Each states its known gaps. ADR 0003 is marked partially superseded.
- Design documents in `docs/domains/` for the ten bounded contexts that lacked one (agent, ai, document, graph, identity, opportunity, organization, plugin, search, workspace), and an index; `knowledge.md` brought up to date with the code.
- `cwd` option on the CLI's `runInit`, and tests that write to a temporary directory.
- Committed in-progress platform work: Gemini and Ollama LLM providers with a provider factory, a password hasher, web-scraper and YouTube-transcript input connectors, and an in-process job queue processor.
- **Sprint 019:** End-to-End (E2E) UI Automation Test Suite (`apps/web/playwright.config.ts`, `apps/web/e2e/`).
  - Configured Playwright E2E UI automation test runner for `@wisdum/web`.
  - Added E2E test suite `apps/web/e2e/dashboard.spec.ts` testing Knowledge Graph, Hybrid Search, and SSE stream indicators.
- **Sprint 018:** Production Observability & Health Metrics (`apps/api/src/routes/health-routes.ts`).
  - Implemented `/healthz` (liveness probe), `/readyz` (database & redis readiness probe), and `/metrics` (Prometheus text format counter & memory gauge metrics).
  - Added unit test suite in `apps/api/src/routes/__tests__/health-routes.test.ts`.
- **Sprint 017:** Wisdum Developer CLI Tooling (`packages/cli/`).
  - Created `@wisdum/cli` workspace package exporting executable binary `wisdum`.
  - Implemented CLI commands: `wisdum init`, `wisdum plugin create <name>`, `wisdum sync`, and `wisdum status`.
  - Added CLI unit test suite in `packages/cli/src/__tests__/cli.test.ts`.
- **Sprint 016:** Production Containerization & Infrastructure Setup (`docker-compose.prod.yml`, `tools/docker/entrypoint-api.sh`, `.env.production.example`).

  - Added enterprise-grade production multi-container Docker Compose orchestration (`docker-compose.prod.yml`) with PostgreSQL (pgvector), Redis, Fastify API, and Next.js standalone web frontend.
  - Implemented production API container entrypoint script (`tools/docker/entrypoint-api.sh`) managing database migrations and readiness checks.
  - Created `.env.production.example` detailing security, database, Redis, AI model, and publishing credentials.
  - Added `npm run docker:prod` and `npm run docker:prod:down` scripts to root `package.json`.
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

### Changed

- **Breaking:** requests without a bearer token or API key are rejected with `401`. An `x-tenant-id` header no longer selects a tenant (it is read only on `POST /v1/auth/login`); the tenant comes from the credential. The shared `WISDUM_API_KEY` webhook key is removed in favour of scoped API keys, and keys created earlier must be revoked and re-issued because they could never authenticate.
- **Breaking:** users created before this release have no role and receive `403` until given one (`tools/grant-system-role`). Tokens issued by sign-up now carry the owner role.
- `JWT_SECRET` must be at least 32 characters and not a known default or placeholder. It is required in production; in development an unset secret becomes a random per-process one. `NODE_ENV=production` now counts as production. `docker-compose.prod.yml` requires `JWT_SECRET` and `POSTGRES_PASSWORD` and sets `WISDUM_ENV`; `.env.production.example` no longer contains a usable secret.
- `POST /v1/onboarding/setup` validates its input and, after the first tenant, is closed unless `WISDUM_ALLOW_SIGNUP=true`. `createdBy` (workspaces) and `ownerId` (conversations) are optional and must match the caller.
- Read-model `findById` ports take a tenant; `AttachWorkspace`, `CreateWorkspace`, and `AddWorkspaceMember` check the referenced organization, workspace, or user is in the caller's tenant.
- `GET /v1/published/:id` is an explicit public route (the web app has a public page for it).
- `docs/api/*` examples use bearer tokens; `docs/api/identity.md` rewritten to match the real endpoints.
- ESLint resolves its 112 outstanding errors: unused imports and variables removed, `any` replaced with real types, type-only imports marked. `no-console` is now allowed in `packages/cli` (terminal output is its interface) and for `console.warn` and `console.error` in `apps/web/src` (browser code has no log transport).
- `QueueProcessor` logs job failures through `@wisdum/logger` (accepting an injected `Logger`) instead of `console`; `@wisdum/platform-jobs` now depends on `@wisdum/logger`.
- `search-routes.ts` and `core-module.ts` use the real `VectorStore` and `EmbeddingProvider` types instead of `any` or ad-hoc shapes.

### Fixed

- **Security:** removed the hard-coded bearer tokens (`dev-token`, `dev-session-token`, `mock-jwt-token`), the public signing secrets (`dev-secret-change-me` and the one in `docker-compose.prod.yml`), the default webhook key (`dev-webhook-key`), and the default production database password.
- **Security:** a user of one tenant could read, change, or delete another tenant's knowledge, documents, organizations, workspaces, plugins, search indexes, conversations, opportunities, and users, by id; every id-based handler now treats another tenant's resource as not found.
- **Security:** most routes trusted a caller-supplied `x-tenant-id` header and needed no credential.
- `POST /v1/conversations/:id/turns` returned `500` for a missing conversation; it now returns `404`.
- `GET` and `POST /v1/agents/tasks` are served again. The `registerAgentRoutes` call was dropped from `server.ts` in `8a89aa0`, so the documented endpoints returned 404.
- `npm test` no longer overwrites a developer's `.wisdumrc.json` or leaves `.temp-test-plugins-*` directories in the repository root; `.wisdumrc.json` is now gitignored.
- `ExecuteAgentTaskHandler` falls back to a default message when a thrown error has an empty message.
