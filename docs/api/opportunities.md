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
