# Contributing to Wisdum

Thank you for your interest in contributing. Wisdum is being built as production-grade open-source infrastructure, and every contribution — code, documentation, design, or review — is expected to move it in that direction.

Please read this document before opening a pull request. It will save you (and reviewers) time.

## Ground rules

- All participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
- Architectural changes require an [ADR](docs/adr/README.md) before implementation.
- The platform principles in [docs/architecture/overview.md](docs/architecture/overview.md) are not optional. PRs that introduce vendor lock-in, cross-domain coupling, or UI-only thinking will be asked to redesign.
- Security vulnerabilities go through [SECURITY.md](SECURITY.md), never public issues.

## Ways to contribute

- **Report bugs** using the bug report issue template.
- **Propose features** using the feature request template. For anything that changes architecture, expect the discussion to result in an ADR.
- **Improve documentation** — documentation is part of the product, not an afterthought.
- **Review pull requests** — thoughtful review is one of the highest-value contributions.

## Development environment

Prerequisites:

- Python 3.11+
- Node.js 18+ with npm or pnpm
- PostgreSQL 14+ (local or Docker)
- Redis

Setup:

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Backend: `python -m venv venv && source venv/bin/activate`, then `pip install -r requirements.txt`.
3. Frontend: `npm install`.
4. Run database migrations: `alembic upgrade head`.
5. Start dev servers in separate terminals:
   - Backend: `python -m uvicorn main:app --reload`
   - Frontend: `npm run dev`

> **Note:** the platform is pre-alpha; some of the steps above will only become meaningful as services land in `services/` and apps in `apps/`.

## Quality gates

Every pull request must pass:

| Check | Backend | Frontend |
| --- | --- | --- |
| Formatting | `black . && isort .` | ESLint/Prettier via `npm run lint` |
| Types | `mypy . --strict` | `npm run type-check` |
| Tests | `pytest` | `npm test` |

Additional expectations:

- Code coverage must not decrease.
- New business logic ships with unit tests; domain interactions get integration tests. Do not write tests for framework boilerplate.
- Public APIs are documented (OpenAPI for REST, event schemas for events).

## Workflow

1. **Discuss first** for anything non-trivial — open an issue before investing significant effort.
2. **Branch from `main`** with a descriptive name: `feature/user-auth`, `fix/search-indexing`, `docs/api-design`. One feature or fix per branch.
3. **Keep commits focused** — one logical change per commit, imperative messages, reference issues where applicable. Example: `Add domain event publishing to knowledge service`.
4. **Open a pull request** using the PR template. Include what changed, why, and links to related issues or ADRs.
5. **Before merge:** squash related commits into logical units, ensure CI is green, and update documentation affected by the change.

## Code organization

Backend domains are self-contained under `services/<domain-name>/` with `models.py`, `schemas.py`, `repository.py`, `service.py`, `events.py`, `routes.py`, and a `tests/` directory. Shared code lives in `packages/`. **Never create dependencies that cross domain boundaries** — domains communicate through events.

See the README in each top-level directory for its conventions.

## What reviewers look for

- Alignment with the architecture and design principles (API-first, DDD, event-driven, plugin-based).
- No new technical debt: no tight coupling, circular dependencies, global state, hard-coded providers, or duplicated business logic.
- Adequate tests and updated documentation.
- An ADR, if the change is architectural.

## Questions

Open an issue if anything here is unclear — unclear contributor documentation is itself a bug worth reporting.
