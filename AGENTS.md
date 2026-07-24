

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

---

# Wisdum Development Instructions

Welcome to the Wisdum repository.

This repository contains the source code, documentation, architecture, and specifications for Wisdum.

## What is Wisdum?

Wisdum is an open-source, AI-native Knowledge Operations Platform.

The platform enables individuals and organizations to transform raw information into connected knowledge, knowledge into business outcomes, and continuously improve through AI-assisted workflows.

Wisdum is **not**:

- a note-taking application
- a CMS
- an AI writing tool
- a project management application

It is infrastructure for knowledge-driven work.

---

# Primary Objective

Your responsibility is not simply to generate code.

Your responsibility is to help build a production-grade open-source platform.

Every change should improve one of the following:

- Architecture
- Maintainability
- Developer Experience
- Extensibility
- Documentation
- Performance
- Security
- Testability

Avoid shortcuts that introduce long-term technical debt.

---

# Engineering Philosophy

Always think in terms of:

- Platform
- Domain
- APIs
- Events
- Plugins
- Workflows

Never think only in terms of screens or features.

The UI is one implementation of the platform.

---

# Design Principles

Always optimize for:

- API First
- Domain Driven Design (DDD)
- Event Driven Architecture
- Plugin Architecture
- AI Native Workflows
- Modular Design
- Self Hosting
- Multi Tenancy
- Open Source
- Clean Architecture

---

# Repository Structure

The repository is organized into:

- `product/` — Product strategy and planning
- `docs/` — Architecture and technical documentation
- `apps/` — User-facing applications
- `packages/` — Shared libraries
- `services/` — Backend services
- `plugins/` — External integrations
- `tools/` — Development utilities
- `examples/` — Example implementations

Keep this structure clean and consistent.

---

# Technology Stack

**Frontend**
- Next.js with React and TypeScript
- Tailwind CSS for styling
- State management via appropriate patterns (avoid Redux unless necessary)

**Backend**
- FastAPI with Python
- Async-first approach for I/O operations
- Dependency injection for testability

**Data & Storage**
- PostgreSQL as primary datastore
- Redis for caching and task queues
- Meilisearch for full-text search
- S3-compatible storage for media/files

**Infrastructure & Async Processing**
- Celery for distributed task processing
- Event-driven architecture for inter-domain communication

**Architecture Patterns**
- Domain-Driven Design (DDD) — each domain has clear boundaries
- Event sourcing for complex state transitions
- Repository pattern for data access
- Dependency injection for loose coupling
- Plugin system for extensibility

---

# Development Commands

Commands follow standard patterns for their respective frameworks. Common operations:

**Backend (FastAPI)**
- `python -m uvicorn main:app --reload` — Start dev server
- `pytest` — Run all tests; `pytest tests/domain_name -v` for specific domain
- `black . && isort .` — Format code
- `mypy . --strict` — Type checking
- `pytest --cov=services --cov-report=html` — Coverage report

**Frontend (Next.js)**
- `npm run dev` — Start dev server (default port 3000)
- `npm run build && npm run start` — Production build
- `npm run lint` — Run ESLint
- `npm test` — Run Jest tests
- `npm run type-check` — TypeScript checking

**Database**
- Migrations follow Alembic pattern (backend)
- Always version-control schema changes
- Rollback scripts must be tested before merge

**Documentation**
- ADRs go in `docs/adr/` with format `NNNN-slug.md`
- Domain models documented in `docs/domains/`
- API specifications in `docs/api/`

---

# Environment Setup

**Prerequisites**
- Python 3.11+ (backend)
- Node.js 18+ and npm/pnpm (frontend)
- PostgreSQL 14+ (local or Docker)
- Redis (for caching/queues)

**Local Development**
1. Copy `.env.example` to `.env.local` and fill in required values
2. Set up virtual environment: `python -m venv venv && source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt` (backend) and `npm install` (frontend)
4. Run migrations: `alembic upgrade head`
5. Start dev servers in separate terminals

**Docker**
- Use `docker-compose.yml` for local infrastructure (PostgreSQL, Redis, Meilisearch)
- Services in `services/` should be containerized for production

**CI/CD**
- GitHub Actions (or equivalent) should run on every PR
- Must pass: linting, type checking, tests
- Code coverage must not decrease
- No merging without passing checks

---

# Code Organization by Domain

Each domain should be self-contained:

```
services/[domain-name]/
├── __init__.py
├── models.py           # Domain entities
├── schemas.py          # Request/response schemas
├── repository.py       # Data access layer
├── service.py          # Business logic
├── events.py           # Domain events
├── routes.py           # API endpoints (if applicable)
└── tests/
    ├── test_models.py
    ├── test_service.py
    ├── test_repository.py
    └── conftest.py     # Shared fixtures
```

Packages shared across domains go in `packages/`. Do not create domain-crossing dependencies.

---

# Documentation First

Before implementing a major feature:

1. Understand the existing documentation.
2. Review relevant ADRs.
3. Update documentation if the architecture changes.
4. Then implement the feature.

Documentation is part of the product.

---

# Architecture Decisions

Major architectural decisions must be documented as ADRs.

Every ADR should explain:

- Context
- Decision
- Consequences

Do not introduce architectural changes without documenting them.

---

# Development Workflow

When implementing new functionality:

1. Understand the problem.
2. Identify the owning domain.
3. Review existing architecture.
4. Design before coding.
5. Keep changes modular.
6. Write maintainable code.
7. Update documentation.
8. Keep commits focused.

---

# Code Quality

Prefer:

- Composition over inheritance
- Explicit interfaces
- Dependency injection where appropriate
- Small focused modules
- Clear naming
- SOLID principles
- Clean Architecture
- Testability

Avoid:

- Tight coupling
- Circular dependencies
- Global state
- Hard-coded providers
- Duplicate business logic
- Premature optimization

---

# Testing Strategy

**Unit Tests** — Test service logic, repositories, and domain models in isolation.
- Use fixtures for common test data
- Mock external dependencies
- Aim for >80% coverage on critical paths

**Integration Tests** — Test domain interactions and API endpoints.
- Use real database instances (test database)
- Test complete workflows end-to-end
- Include event publishing/consumption

**API Testing** — Validate contract and error handling.
- Test success and error paths
- Validate schema compliance
- Test authentication/authorization boundaries

Do not write tests for obvious getters/setters or framework boilerplate. Focus on business logic and edge cases.

---

# API Design

All APIs should:

1. **Be RESTful** — Use standard HTTP methods and status codes
2. **Be versioned** — Include version in URL path or header
3. **Be documented** — Use OpenAPI/Swagger spec
4. **Have clear contracts** — Define request/response schemas in code
5. **Handle errors gracefully** — Return appropriate error codes with descriptive messages
6. **Support pagination** — For list endpoints
7. **Support filtering** — Where applicable

Event-driven patterns should use:
- Message schemas defined in shared packages
- Clear event naming: `[domain].[entity].[action]` (e.g., `knowledge.document.created`)
- Event versioning for backward compatibility

---

# AI Philosophy

AI is a first-class subsystem.

Design AI capabilities as reusable services rather than embedding AI logic throughout the codebase.

Support multiple providers through abstraction layers.

Avoid vendor lock-in.

---

# Plugin Philosophy

External services should be implemented as plugins whenever practical.

Examples:

- AI Providers
- Publishing Providers
- Authentication Providers
- Search Providers
- Storage Providers
- Analytics Providers

The core platform should remain independent of specific vendors.

---

# Git Workflow & Commits

**Branching**
- Branch from `main`
- Use descriptive names: `feature/user-auth`, `fix/search-indexing`, `docs/api-design`
- One feature/fix per branch

**Commits**
- Keep commits focused — one logical change per commit
- Use clear, imperative commit messages
- Reference issue/ticket numbers when applicable
- Example: `Add domain event publishing to knowledge service` or `Fix race condition in concurrent document updates`

**Pull Requests**
- Include a summary of what changed and why
- Link related issues/ADRs
- Ensure CI/tests pass before review
- Code review should verify:
  - Architectural alignment with AGENTS.md principles
  - No architectural debt introduced
  - Tests are adequate
  - Documentation updated if needed

**Before Merging**
- Squash related commits into logical units (one commit per feature)
- Ensure commit history is clean and readable
- All tests passing
- Documentation complete

---

# Long-Term Vision

Every implementation should answer this question:

> "Will this still make sense when Wisdum has millions of knowledge assets, thousands of organizations, and an active open-source community?"

If the answer is no, redesign before implementing.

---

# Working Style

Act as a senior software architect and engineer.

Challenge assumptions.

Suggest improvements when appropriate.

Protect architectural integrity.

Prefer long-term maintainability over short-term convenience.

When requirements are ambiguous:

- ask clarifying questions
- explain trade-offs
- recommend the most scalable solution

Never implement features that conflict with the architecture without explicitly highlighting the trade-offs.

---

# Guiding Principle

Wisdum is not just software.

It is an open platform for knowledge operations.

Every contribution should move the platform toward becoming the reference infrastructure for knowledge-driven work.

---

# API Extension Conventions (Learned)

## Adding New Fastify Routes

When registering a new route file in `apps/api/src/server.ts`:

1. Import **all** required DI tokens from `'./container/tokens.js'` in the same import block at the top — never split into a second import block.
2. Update the route registration function signature to accept extra dependencies (repository, clock, ids) **before** touching `server.ts` — prevents `TS2304` errors.
3. Always rebuild with `npm run build` after route changes to catch errors early.

**Standard pattern for injecting dependencies into a route registration:**
```ts
registerXRoutes(
  app,
  kernel.container.resolve(X_HANDLERS),
  kernel.container.resolve(X_REPOSITORY),
  kernel.container.resolve(CLOCK),
  kernel.container.resolve(ID_GENERATOR),
);
```

## Webhook Endpoints

Public ingestion webhooks live at `POST /v1/webhooks/<domain>`.

- **Auth pattern**: Read `WISDUM_API_KEY` env var (default `dev-webhook-key`) from the `x-api-key` header; throw `AuthenticationError` on mismatch.
- **Tenant resolution**: Use `x-tenant-id` header, resolved via `requireTenantId(request)`.
- **Validation schema**: Add `createWebhook<Domain>BodySchema` to `apps/api/src/validation/<domain>-schemas.ts`.

## Validation Schemas

New body/params validation schemas belong in `apps/api/src/validation/<domain>-schemas.ts` and must be explicitly imported into the corresponding route file. Never inline schemas into route handler bodies.

## API Documentation

Every new endpoint family gets a dedicated `docs/api/<feature>.md` file with:
- Method + path + port
- Headers table (with Required column)
- Request body field table
- JSON payload examples (one per medium type where applicable)
- Response schema (success + all error codes)
- A complete `curl` example

Link it from `docs/api/README.md` under a `## <Feature>` section.

---

# Frontend Extension Conventions (Learned)

## JSX Structural Rules

When injecting a new button alongside an existing lone `<button>` in a header:
- Wrap both buttons in `<div className="flex items-center gap-3">` **before** closing the parent container `</div>`.
- The existing button's `onClick` and `className` attributes must be re-indented to match the new wrapper depth.
- Run `npm run build --workspace=@wisdum/web` to catch bracket/ternary mismatches before considering the change done.

## Standard Modal Pattern

Suggestion/creation modals use a plain `{isOpen && (...)}` conditional — no external modal library:

```tsx
{isModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950/95 flex flex-col gap-4">
      {/* Header: title + ✕ close button */}
      {/* Body: labeled inputs / selects / textareas */}
      {/* Footer: Cancel + Submit */}
    </div>
  </div>
)}
```

Close button pattern: `onClick={() => setIsModalOpen(false)}`.  
Submit button pattern: `disabled={isSubmitting}` + `onClick={() => void handleSubmit()}`.

## Dual-Mode Draft Editor Pattern

When upgrading a textarea to a mode-toggled editor:
1. Add `const [activeEditorTab, setActiveEditorTab] = useState<'rich' | 'source'>('rich')`.
2. **Rich mode**: `font-serif text-base leading-relaxed` for proportional prose layout.
3. **Source mode**: `font-mono text-sm` for raw markdown syntax editing.
4. Always expose live `wordCount` and `readTime` metrics computed inline from `bodyDraft`.

---

# Common TypeScript & JSX Errors (Learned)

## TS2353 — `Object literal may only specify known properties`

Caused by passing extra fields (e.g., `tenantId`) to a command factory that doesn't declare them.

**Fix**: Inspect the command interface in `packages/application/src/*/commands/<command>.ts` and only pass fields that are explicitly declared on the interface (excluding `kind`).

## TS2304 — `Cannot find name 'X'`

Caused by using a DI token (e.g., `OPPORTUNITY_REPOSITORY`) inside `server.ts` without importing it.

**Fix**: Add the missing token name to the existing `import { ... } from './container/tokens.js'` block at the top of `server.ts`. Never create a second import block for the same module.

## JSX Parse Failure — `Unexpected token '}'` or `Expression expected`

Caused by mismatched ternary closing braces or a missing `)}` after a conditional render block — typically introduced when a multi-line replace partially overwrites the closing sequence.

**Fix**: Locate the ternary expression most recently modified and confirm its full `condition ? (<A />) : (<B />)}` sequence is intact. Run `npm run build --workspace=@wisdum/web` to pinpoint the exact line.

