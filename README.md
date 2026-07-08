# Wisdum

**Wisdum is an open-source, AI-native Knowledge Operations Platform.**

It is infrastructure for knowledge-driven work: it enables individuals and organizations to transform raw information into connected knowledge, turn knowledge into business outcomes, and continuously improve through AI-assisted workflows.

> **Status: pre-alpha.** Wisdum is in early foundational development. The API and web dashboard run end to end (see [Getting started](#getting-started)), but coverage across bounded contexts is uneven and APIs and structure will change without notice.

## What Wisdum is not

Wisdum is deliberately **not**:

- a note-taking application
- a CMS
- an AI writing tool
- a project management application

Those are features other products offer. Wisdum is the platform layer underneath knowledge-driven work — the UI is only one implementation of it.

## Architecture at a glance

Wisdum is designed around a small set of non-negotiable principles:

- **API-first** — every capability is exposed through versioned, documented APIs; the UI consumes the same APIs as everyone else.
- **Domain-driven** — the platform is composed of self-contained domains with explicit boundaries, communicating through events.
- **Event-driven** — domains publish and consume domain events (`[domain].[entity].[action]`) rather than calling into each other.
- **Plugin architecture** — external providers (AI, auth, search, storage, publishing, analytics) are plugins; the core stays vendor-independent.
- **AI-native** — AI is a first-class subsystem exposed as reusable services behind provider abstractions, not logic scattered through the codebase.
- **Self-hostable and multi-tenant** — designed to run on your own infrastructure from day one.

See [docs/architecture/overview.md](docs/architecture/overview.md) for the full picture and [docs/adr/](docs/adr/) for the decisions behind it.

## Repository layout

| Directory | Purpose |
| --- | --- |
| [`product/`](product/) | Product strategy, vision, and planning |
| [`docs/`](docs/) | Architecture, ADRs, domain models, API specifications |
| [`apps/`](apps/) | User-facing applications — composition layers only |
| [`packages/`](packages/) | Shared libraries: domain, contracts, events, and infrastructure |
| [`platform/`](platform/) | Platform capability packages (auth, ai, plugins, search, storage, jobs) |
| [`services/`](services/) | Backend domain services |
| [`plugins/`](plugins/) | External provider integrations |
| [`tools/`](tools/) | Development and operations utilities |
| [`examples/`](examples/) | Example implementations and integrations |

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python, async-first) |
| Primary datastore | PostgreSQL |
| Cache & queues | Redis, Celery |
| Full-text search | Meilisearch |
| Media & files | S3-compatible object storage |

The rationale is recorded in [ADR 0003](docs/adr/0003-core-technology-stack.md).

## Getting started

The monorepo builds from the root (Node.js 18.18+):

```sh
npm install
npm run build      # compile all packages (TypeScript project references)
npm run typecheck  # full type check
npm run lint       # ESLint across the workspace
npm run test       # unit tests (Vitest)
npm run format     # Prettier
```

### Running the platform

The API (`apps/api`, Fastify) and web dashboard (`apps/web`, Next.js) are
runnable end to end. The API falls back to in-memory adapters for
anything not configured (Postgres, Redis), so the fastest way to try it
is with just a signing secret:

```sh
# Terminal 1 — API (in-memory persistence/cache; no Postgres/Redis required)
JWT_SECRET=dev-secret npm run build --workspace @wisdum/api && \
  node apps/api/dist/main.js   # http://localhost:3001

# Terminal 2 — web dashboard
npm run dev --workspace @wisdum/web   # http://localhost:3000
```

For a persistent setup with real Postgres and Redis, copy `.env.example`
to `.env` and fill in `JWT_SECRET`, then:

```sh
docker compose up --build
```

This starts Postgres, Redis, the API (migrating on startup), and the web
dashboard (`http://localhost:3000`). Set `ANTHROPIC_API_KEY` or
`OPENAI_API_KEY` in `.env` to enable AI conversation replies; both are
optional.

To learn the architecture rather than just run it:

1. Read [docs/architecture/overview.md](docs/architecture/overview.md).
2. Read the ADRs in [docs/adr/](docs/adr/) — [ADR 0004](docs/adr/0004-typescript-workspace-topology.md) explains the workspace layout.
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Project decision-making is described in [GOVERNANCE.md](GOVERNANCE.md).

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md) — never through public issues.

## License

Wisdum is licensed under the [Apache License 2.0](LICENSE).
