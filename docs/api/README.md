# API Specifications

This directory holds Wisdum's API design standards and, as services land, the OpenAPI specifications for each domain's public API (`<domain-name>.openapi.yaml`).

## Design standards

All Wisdum APIs must:

1. **Be RESTful** — standard HTTP methods and status codes; resources as nouns.
2. **Be versioned** — version in the URL path (`/api/v1/...`); breaking changes require a new version.
3. **Be documented** — every endpoint appears in a checked-in OpenAPI spec (FastAPI-generated specs are exported here, not hand-maintained).
4. **Have explicit contracts** — request/response schemas defined in code (Pydantic), mirrored in the spec.
5. **Handle errors uniformly** — appropriate status codes with a consistent error body:
   ```json
   {
     "error": {
       "code": "resource_not_found",
       "message": "Human-readable description",
       "details": {}
     }
   }
   ```
6. **Paginate list endpoints** — cursor-based pagination (`cursor`, `limit`) with a `next_cursor` in responses.
7. **Support filtering** where applicable, via query parameters.
8. **Be tenant-scoped** — tenancy is resolved from authentication context, never from client-supplied identifiers.
9. **Be authenticated and authorized by default** — every endpoint needs a credential and a permission unless it is explicitly public. See [Authentication](#authentication-and-authorization).

## Authentication and authorization

Send `Authorization: Bearer <token>` (a session token from `POST /v1/auth/login`) or an API key (`x-api-key: w_sk_…`) on every request. The tenant comes from the credential. Failures use the error body above:

| Status | `error.code` | Meaning |
| --- | --- | --- |
| `401` | `authentication_error` | Missing, invalid, expired, or revoked credential |
| `403` | `authorization_error` | Valid credential without the required permission (`error.details.required` says which) |
| `404` | `not_found` | No such resource in your tenant; other tenants' resources look the same |

Roles, permissions, API keys, and sign-up are documented in the [Identity API](identity.md), and the reasoning is in [ADR 0016](../adr/0016-authentication-authorization-and-tenant-isolation.md).

## Events as API

Domain events are a public contract with the same discipline as REST endpoints:

- Names follow `[domain].[entity].[action]` — e.g. `knowledge.document.created`.
- Schemas live in shared packages and are versioned for backward compatibility.
- Consumers must tolerate unknown fields; producers must never repurpose existing ones.

## Domain APIs & Feature Specs

- 📖 [Knowledge API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/knowledge.md) — Knowledge CRUD, import, export, and status
- 📄 [Document API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/documents.md) — Raw document ingestion and processing
- 🔐 [Identity API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/identity.md) — Session auth and API key management
- 💡 [Opportunities API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/opportunities.md) — Discovered creation opportunities & multi-channel publishing
- 🕸️ [Graph Topology API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/graph.md) — Knowledge graph concepts & relationships
- 🔍 [Hybrid Search API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/search.md) — Hybrid BM25 & dense vector search
- 🤖 [Autonomous Agents API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/agents.md) — Writing & publishing agent task orchestration
- 🧠 [Reasoning Engine API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/reasoning.md) — Multi-tenant graph reasoning passes
- 📡 [Real-Time Events API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/events.md) — Server-Sent Events (SSE) stream endpoint
- 🔌 [Plugin Marketplace API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/plugins.md) — Plugin management & manifest pre-flight validation
- 💬 [AI Conversations API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/ai.md) — AI assistant sessions & messaging
- 🏢 [Organizations API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/organizations.md) — Enterprise organizations & workspace attachment
- 📂 [Workspaces API Specification](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/workspaces.md) — Tenant workspace management & membership

## Ingestion Webhooks

For external ingestion services, see the [Webhook Ingestion API](file:///Users/Anurag/PycharmProjects/wisdum-os/docs/api/webhooks.md) specification.


## Change control

Breaking changes to any published API or event schema require an ADR and a deprecation path for existing consumers.
