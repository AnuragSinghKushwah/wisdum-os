# 0005 — Core runtime language

- **Status:** Accepted
- **Date:** 2026-07-06
- **Deciders:** Founding maintainer
- **Supersedes:** ADR 0003 (technology stack — language tier only)

## Context

ADR 0003 designated FastAPI/Python for backend domain services under `services/`, while ADR 0004 placed core business logic in `packages/domain` (TypeScript, built into the workspace with npm/tsc). The two ADRs are mutually compatible but left the language boundary unresolved: Is the domain TypeScript? Is it Python? Where does each run?

This ambiguity must be resolved before the first bounded context is implemented.

## Decision

**The core platform domain is TypeScript.** Business logic, aggregates, entities, value objects, domain events, and specifications live in `packages/domain` and are compiled and tested as part of the root workspace build (`npm run build`).

**Python is reserved for runtimes, ML, OCR, embeddings, and computational workloads.** When the platform needs to call into heavy ML (semantic search, RAG, embeddings, OCR, vision, language models), it does so via plugin boundaries: `platform/ai` exposes provider contracts that plugin implementations under `plugins/` satisfy (possibly by shelling out to Python services or calling remote APIs).

**The API application** (`apps/api`) is a TypeScript/Fastify composition root — it wires together TypeScript domain packages and exposes their logic through REST endpoints. When substantial Python work is needed (e.g., embedding generation), the API layer invokes a Python plugin, not Python domain logic.

## Consequences

- **Unified domain layer:** bounded contexts are TypeScript, versioned as one workspace, tested together, no cross-language integration friction at the domain boundary.
- **Python plugins are first-class.** The AI subsystem is the primary surface; other heavy-compute workloads can follow the same pattern (vision, OCR, NLP).
- **Type safety end-to-end.** No JSON round-tripping at domain boundaries within the core application.
- **Fastify is relegated to routing and middleware** (see updated ADR 0003 alternatives): authentication, tenancy resolution, request/response translation. Business logic is in TypeScript, orchestrated through Fastify — not distributed between them.
- **Python service development becomes future work.** For now, Python lives in plugins and local CLI tools, not in the `services/` directory. As the platform grows and AI becomes a bottleneck, a follow-up ADR may introduce Python services under `services/py/` or similar, but the core domain stays TypeScript.

## Alternatives considered

- **All Python.** Rejected: JavaScript/TypeScript is the lingua franca for the web, and UI integration would suffer; the workspace would fragment.
- **All TypeScript.** Rejected: Python's ML ecosystem is incomparable; forcing ML workloads through TypeScript bridges (node-python, etc.) is operationally fragile.
- **Separate TypeScript domain + Python services.** The current state; incompletely resolved. This ADR commits to TypeScript as the answer for the domain itself.
- **Language-agnostic RPC (gRPC).** Possible future step once services proliferate, but premature now; the workspace approach is simpler.
