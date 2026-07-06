# Wisdum

**Wisdum is an open-source, AI-native Knowledge Operations Platform.**

It is infrastructure for knowledge-driven work: it enables individuals and organizations to transform raw information into connected knowledge, turn knowledge into business outcomes, and continuously improve through AI-assisted workflows.

> **Status: pre-alpha.** Wisdum is in early foundational development. There is no runnable application yet — the current focus is architecture, documentation, and platform scaffolding. APIs and structure will change without notice.

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

The monorepo skeleton builds from the root (Node.js 18.18+):

```sh
npm install
npm run build      # compile all packages (TypeScript project references)
npm run typecheck  # full type check
npm run lint       # ESLint across the workspace
npm run format     # Prettier
```

There is no runnable product yet — the packages are scaffolding with enforced boundaries. To get involved now:

1. Read [docs/architecture/overview.md](docs/architecture/overview.md).
2. Read the ADRs in [docs/adr/](docs/adr/) — [ADR 0004](docs/adr/0004-typescript-workspace-topology.md) explains the workspace layout.
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Project decision-making is described in [GOVERNANCE.md](GOVERNANCE.md).

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md) — never through public issues.

## License

Wisdum is licensed under the [Apache License 2.0](LICENSE).
