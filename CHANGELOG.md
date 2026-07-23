# Changelog

All notable changes to Wisdum are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
