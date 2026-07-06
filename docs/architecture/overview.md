# Architecture Overview

Wisdum is an AI-native Knowledge Operations Platform. This document describes the target architecture that all implementation must align with. Decisions referenced here are recorded as [ADRs](../adr/).

## System shape

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                     │
│  apps/web · apps/* · third-party integrations · automation   │
└──────────────────────────┬──────────────────────────────────┘
                           │  versioned REST APIs (OpenAPI)
┌──────────────────────────▼──────────────────────────────────┐
│  Platform API layer                                          │
│  auth · tenancy resolution · rate limiting · API versioning  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Domain services (services/)                                 │
│  self-contained domains: models · service · repository       │
│  communicate ONLY via domain events, never direct imports    │
└───────┬──────────────────┬───────────────────────┬──────────┘
        │ events           │ provider contracts    │
┌───────▼────────┐ ┌───────▼───────────┐ ┌─────────▼──────────┐
│  Event bus     │ │  AI subsystem     │ │  Plugins           │
│  Celery/Redis  │ │  reusable AI      │ │  auth · search ·   │
│  [domain].     │ │  services behind  │ │  storage · publish │
│  [entity].     │ │  provider         │ │  · analytics · AI  │
│  [action]      │ │  abstractions     │ │  providers         │
└────────────────┘ └───────────────────┘ └────────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────┐
│  Data layer                                                  │
│  PostgreSQL (primary) · Redis (cache/queue) ·                │
│  Meilisearch (search) · S3-compatible (media/files)          │
└──────────────────────────────────────────────────────────────┘
```

## Core concepts

### API-first

Every platform capability is exposed through a versioned, OpenAPI-documented REST API. The web application is a client of these APIs with no privileged access. Design standards live in [../api/README.md](../api/README.md).

### Domains

The platform is decomposed into self-contained domains (Domain-Driven Design). Each domain owns its entities, business logic, persistence, and events, and lives in its own directory under `services/`. Domains never import from each other; shared code is promoted to `packages/`. Each domain is documented in [../domains/](../domains/).

### Events

Inter-domain communication is event-driven. Domains publish events named `[domain].[entity].[action]` (e.g. `knowledge.document.created`) with schemas defined in shared packages and versioned for backward compatibility. Events are the platform's integration surface — plugins and AI workflows subscribe to them.

### Plugins

Anything vendor-specific is a plugin: AI providers, authentication providers, search providers, storage providers, publishing targets, analytics. The core platform defines provider contracts; plugins implement them. This keeps the platform self-hostable and free of lock-in.

### AI subsystem

AI is a first-class subsystem, not a feature sprinkled through the codebase. AI capabilities are reusable services (extraction, connection, summarization, workflow assistance) that domains invoke through an abstraction layer supporting multiple providers.

### Multi-tenancy

The platform is multi-tenant from the first schema migration. Tenancy is resolved at the API layer and enforced in every domain's data access; no query executes without a tenant scope.

## Architectural rules

These are enforced in code review (and, over time, by lint tooling):

1. No imports across domain boundaries — communicate via events.
2. No vendor SDK usage outside `plugins/` — depend on provider contracts.
3. No business logic in API routes — routes translate HTTP to service calls.
4. No synchronous blocking I/O in request or event paths.
5. No schema change without a version-controlled migration and tested rollback.
6. No architectural change without an accepted ADR.

## Status

The platform is pre-alpha: this document describes the target architecture ahead of implementation. As domains land, this overview gains links to their concrete documentation; discrepancies between this document and code are bugs in one of them.
