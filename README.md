# Wisdum OS

<p align="center">
  <img src="https://raw.githubusercontent.com/AnuragSinghKushwah/wisdum-os/main/docs/assets/banner.png" alt="Wisdum OS Banner" width="100%" error="true" />
</p>

<p align="center">
  <strong>The Open-Source, AI-Native Knowledge Operations Platform</strong>
</p>

<p align="center">
  <a href="#license"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/Node.js-18%2B-green.svg" alt="Node.js"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript"></a>
  <a href="#quick-start--installation"><img src="https://img.shields.io/badge/Docker-Ready-blue.svg" alt="Docker"></a>
  <a href="#tests--quality"><img src="https://img.shields.io/badge/Tests-235%20Passing-brightgreen.svg" alt="Tests"></a>
</p>

---

## 🌟 What is Wisdum OS?

**Wisdum OS** is infrastructure for knowledge-driven work. It enables individuals and organizations to transform raw information into connected knowledge, turn knowledge into measurable business outcomes, and continuously improve through AI-assisted workflows.

Wisdum is **not** a simple note-taking app or CMS. It is an open-source, multi-tenant Knowledge Operations Platform designed with Domain-Driven Design (DDD), Event-Driven Architecture (EDA), and vendor-neutral AI abstractions.

---

## ✨ Key Features

- 🕸️ **Knowledge Graph & Reasoning Engine**: Automatically extracts domain concepts, computes co-occurrence relationships, and executes reasoning passes over captured assets.
- 🔍 **Hybrid Cognitive Search**: Combines BM25 keyword matching with `pgvector` dense vector embeddings for semantic precision.
- 📡 **Real-Time Event Streaming**: Stream live platform events (`knowledge.asset.*`, `opportunity.*`, `agent.task.*`) directly to web clients over Server-Sent Events (SSE).
- 🤖 **Autonomous Writing & Publishing Agents**: Agent task orchestration engine for automated opportunity draft generation and task execution.
- 📢 **Multi-Channel Publishing**: Native publishing connectors for **Dev.to**, **Ghost**, **Substack**, **LinkedIn**, **Twitter/X**, and **Websites**.
- 🔌 **Plugin SDK & Marketplace**: Extend platform capabilities with `@wisdum/plugin-sdk` and pre-flight manifest validation (`POST /v1/plugins/manifest/validate`).
- ⚡ **Wisdum CLI Tooling**: Programmatic workspace initialization, plugin scaffolding, and connector synchronization via `@wisdum/cli`.
- 📊 **Production Observability**: Built-in `/healthz` (liveness), `/readyz` (database & redis readiness), and `/metrics` (Prometheus metrics format).

---

## 🚀 Use it today

The shortest path from a clean checkout to drafts written from your own material. You need Node.js 22, npm, and Docker (for Postgres and Redis, so your data survives restarts).

```bash
git clone https://github.com/AnuragSinghKushwah/wisdum-os.git && cd wisdum-os
npm install
npm run setup     # creates .env, generates a session secret, tells you which AI provider is configured
```

Add **one** AI provider to `.env` (the first one set is used, in this order). Without one, the app runs in *demo mode* and cannot write from your sources.

| Variable | Provider |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude |
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` | Gemini |
| `OLLAMA_HOST` | A local Ollama (for example `http://localhost:11434`; set `REASONING_LLM_MODEL` to a model you have pulled) |

Then start everything with one command:

```bash
npm run local     # starts Postgres + Redis with Docker if needed, then the API and the web app. Ctrl-C stops them.
```

1. Open <http://localhost:3000/sign-up> and create your workspace. The first account on an empty database becomes the owner, and sign-up then closes. If it says sign-up is closed (the database already has a tenant), stop and run `npm run local -- --signup` once, create your account, then restart with plain `npm run local`.
2. **Knowledge** → *Add Asset*: paste text, upload a PDF, `.txt` or `.md`, or paste a web address. YouTube links are not turned into transcripts yet; paste the transcript.
3. Open the asset and use **Create content from this source**: pick LinkedIn, X thread, newsletter, blog, YouTube script or podcast, optionally add an angle, and create the drafts.
4. In **Drafts**, edit, then **Copy text** and post it. **Publish** creates a shareable page on your own Wisdum site (and posts blog drafts to Dev.to or Ghost if you configure them in `.env`). LinkedIn and X have no integration; copy and paste.

Your data lives in the `postgres_data` Docker volume and survives restarts. To stop the databases: `npm run docker:down` (your data stays). To back up: `docker compose exec -T postgres pg_dump -U wisdum wisdum > wisdum-backup.sql`.

Drafts are written from your source and told not to invent facts, but a model can still get things wrong. Read each one before you publish it.

---

## 🚀 Quick Start & Installation

### Prerequisites

- **Node.js**: `18.18+` or `22.x`
- **npm**: `9.x+`
- **Docker & Docker Compose**: (Recommended for persistent database & cache stack)

---

### Option 1: Quickstart with Docker Compose (Recommended)

Run the full production-ready stack (PostgreSQL + pgvector, Redis, Fastify API, Next.js Web Dashboard) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/AnuragSinghKushwah/wisdum-os.git
cd wisdum-os

# 2. Copy the production environment template
cp .env.production.example .env.production

# 3. Build and launch the container stack
npm run docker:prod
```

Once running, access:
- 🌐 **Web Dashboard UI**: [http://localhost:3000](http://localhost:3000)
- 🔌 **Fastify REST API**: [http://localhost:3001](http://localhost:3001)
- 🏥 **API Health Check**: `curl http://localhost:3001/healthz`
- 📊 **Prometheus Metrics**: `curl http://localhost:3001/metrics`

To stop the containers:
```bash
npm run docker:prod:down
```

---

### Option 2: Local Monorepo Development

If you prefer to run the platform locally for development:

```bash
# 1. Install dependencies
npm install

# 2. Build all 25 workspace packages (TypeScript project references)
npm run build

# 3. Execute the full unit test suite (Vitest)
npm run test

# 4. Start local development servers
# Terminal 1 — Fastify API
npm run dev:api   # (or npm run dev --workspace @wisdum/api) -> http://localhost:3001

# Terminal 2 — Next.js Web Dashboard
npm run dev:web   # (or npm run dev --workspace @wisdum/web) -> http://localhost:3000
```

---

### Option 3: Using Wisdum CLI (`@wisdum/cli`)

Initialize configurations, scaffold custom plugins, or trigger connector syncs using the Wisdum CLI:

```bash
# Initialize a new workspace configuration (.wisdumrc.json)
npx wisdum init

# Scaffold a new plugin template
npx wisdum plugin create "My Custom Connector"

# Check API health status
npx wisdum status

# Trigger connector sync
npx wisdum sync --connector github
```

---

## 📚 API Specifications

Every API endpoint in Wisdum OS is fully versioned, documented, and tenant-scoped. See the [`docs/api/`](docs/api/README.md) directory for full Markdown specifications:

| Domain / Feature | Specification Document | Key Capabilities |
| :--- | :--- | :--- |
| **Knowledge** | [docs/api/knowledge.md](docs/api/knowledge.md) | Knowledge CRUD, import/export, lifecycle |
| **Document** | [docs/api/documents.md](docs/api/documents.md) | Raw document upload & processing |
| **Hybrid Search** | [docs/api/search.md](docs/api/search.md) | BM25 keyword + pgvector dense search |
| **Knowledge Graph** | [docs/api/graph.md](docs/api/graph.md) | Graph concepts & relationship topology |
| **Opportunities** | [docs/api/opportunities.md](docs/api/opportunities.md) | Discovered creation opportunities & publishing |
| **Real-Time Events** | [docs/api/events.md](docs/api/events.md) | Server-Sent Events (SSE) live push stream |
| **Plugin Marketplace**| [docs/api/plugins.md](docs/api/plugins.md) | Manifest validation & plugin setup |
| **Identity & Auth** | [docs/api/identity.md](docs/api/identity.md) | User authentication & API keys |
| **Autonomous Agents**| [docs/api/agents.md](docs/api/agents.md) | Background writing & publishing agent tasks |

---

## 📂 Repository Layout

| Directory | Description |
| :--- | :--- |
| [`apps/`](apps/) | Executable application layers (`apps/api` Fastify server, `apps/web` Next.js dashboard UI) |
| [`packages/`](packages/) | Shared libraries (`domain`, `application`, `infrastructure`, `contracts`, `events`, `plugin-sdk`, `cli`) |
| [`platform/`](platform/) | Platform capability engines (`ai`, `publishing`, `inputs`, `plugins`, `search`, `storage`, `auth`, `jobs`) |
| [`docs/`](docs/) | Architecture overview, ADRs, domain models, and API specifications |
| [`tools/`](tools/) | Production container entrypoint scripts & dev utilities |

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend API**: Fastify, Async CQRS Pattern, Dependency Injection
- **Database & Search**: PostgreSQL 16 with `pgvector`, Redis 7
- **AI Infrastructure**: OpenAI, Anthropic, and Local Transformers (`@xenova/transformers`)
- **CLI & SDK**: Node.js ESM `@wisdum/cli` & `@wisdum/plugin-sdk`

---

## 🧪 Tests & Quality

Run the complete automated test suite across all packages:

```bash
# Run 235+ unit tests across 63 test suites
npm run test

# Run type check
npm run typecheck

# Run linter
npm run lint
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on the development workflow, branching strategies, and code formatting.

All community participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

Wisdum OS is open-source software licensed under the [Apache License 2.0](LICENSE).
