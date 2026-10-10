# Opportunities & Publishing API Specification

Manages discovered knowledge opportunities, AI draft generation, and multi-channel publishing actions.

## 1. List Opportunities (`GET /v1/opportunities`)

Retrieves content creation opportunities identified during reasoning passes.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/opportunities \
  -H "authorization: Bearer $WISDUM_TOKEN"
```

### Response Schema (`200 OK`)
```json
[
  {
    "id": "00000000-0000-4000-8000-000000000055",
    "title": "Designing Multi-Tenant Vector Architectures",
    "type": "architecture_document",
    "status": "proposed",
    "rationale": "High concept density around pgvector and multi-tenancy",
    "createdAt": "2026-07-27T12:00:00.000Z"
  }
]
```

---

## 2. Publish Content Draft (`POST /v1/opportunities/:id/publish`)

Publishes an opportunity draft to external platforms (Dev.to, Ghost, Substack, LinkedIn, Twitter, Website).

### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `targetPlatform` | `string` | **Yes** | Target platform (`devto`, `ghost`, `substack`, `linkedin`, `twitter`, `website`) |
| `title` | `string` | **Yes** | Article or post title |
| `content` | `string` | **Yes** | Markdown body content |

### Example Request
```bash
curl -X POST http://localhost:3000/v1/opportunities/00000000-0000-4000-8000-000000000055/publish \
  -H "authorization: Bearer $WISDUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetPlatform": "devto",
    "title": "Multi-Tenant Vector Search with Postgres",
    "content": "# Multi-Tenant Vector Search..."
  }'
```

### Response Schema (`200 OK`)
```json
{
  "publishedContentId": "00000000-0000-4000-8000-000000000099",
  "externalUrl": "https://dev.to/wisdum/multi-tenant-vector-search-1234"
}
```

---

## 3. Create Content From a Source (`POST /v1/knowledge/:id/generate`)

Turns one knowledge asset into a draft for each chosen platform, written from the asset's own text. Needs `knowledge:read`, `opportunity:write` and `draft:write`.

### Request Body
| Field | Type | Notes |
| --- | --- | --- |
| `platforms` | string[] | One to six of `linkedin_post`, `x_thread`, `newsletter`, `blog_post`, `youtube_script`, `podcast_outline`, or any other opportunity type. Duplicates are collapsed. |
| `instructions` | string (optional, up to 2,000 characters) | The angle, audience or emphasis, applied to every draft. |

### Example Request
```bash
curl -X POST http://localhost:3001/v1/knowledge/$KNOWLEDGE_ID/generate \
  -H "authorization: Bearer $WISDUM_TOKEN" \
  -H "content-type: application/json" \
  -d '{"platforms": ["linkedin_post", "newsletter"], "instructions": "aimed at engineering leads"}'
```

### Response Schema (`200 OK`)
Each platform succeeds or fails on its own. An opportunity whose draft failed stays `proposed` and can be retried with `POST /v1/opportunities/:id/draft`.
```json
{
  "results": [
    { "platform": "linkedin_post", "opportunityId": "…", "draftId": "…" },
    { "platform": "newsletter", "opportunityId": "…", "error": "model overloaded" }
  ],
  "sourceTruncated": false
}
```
`sourceTruncated` is `true` when the asset is longer than the source budget (60,000 characters by default; set `WISDUM_SOURCE_BUDGET_CHARS` to change it), so the drafts were written from its first part only.

### Errors
| Status | Code | When |
| --- | --- | --- |
| `400` | `validation_error` | Unknown platform, none chosen, more than six, or the asset has no text yet. |
| `404` | `not_found` | The asset does not exist in the caller's tenant. |
| `503` | `configuration_error` | No AI provider is configured. The action never writes from the offline mock model. |

---

## 4. System Capabilities (`GET /v1/system/capabilities`)

Reports whether a real model backs content generation. Needs `dashboard:read`. The web app uses it to show a "Demo mode" banner.

```json
{ "ai": { "mode": "live", "provider": "anthropic" } }
```
`mode` is `mock` (with no `provider`) when no AI provider is configured.
