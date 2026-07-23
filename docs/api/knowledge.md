# Knowledge API Specification

Comprehensive REST API for managing knowledge assets in the Wisdum platform.

## Base URL

`http://localhost:3000/v1/knowledge`

## Headers

| Header | Required | Type | Description |
|---|---|---|---|
| `x-tenant-id` | **Yes** | String (UUID) | Tenant context boundary |
| `x-api-key` | Webhook only | String | API key authentication for ingestion webhooks |
| `Content-Type` | **Yes** | String | `application/json` (or `multipart/form-data` for `/upload`) |

---

## Endpoints

### 1. Create Knowledge Asset

`POST /v1/knowledge`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **Yes** | Asset title |
| `type` | string | **Yes** | Type (`document`, `markdown`, `note`, `webpage`, `pdf`, `repository`) |
| `visibility` | string | **Yes** | `private`, `workspace`, or `public` |
| `sourceKind` | string | **Yes** | `manual`, `upload`, `url`, `integration` |
| `sourceUri` | string | No | Source URL or URI |
| `description` | string | No | Asset description |
| `labels` | string[] | No | Categorization labels |

#### Example Request
```bash
curl -X POST http://localhost:3000/v1/knowledge \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Architecture Blueprint",
    "type": "document",
    "visibility": "workspace",
    "sourceKind": "manual",
    "description": "DDD bounded context architecture",
    "labels": ["architecture", "backend"]
  }'
```

#### Example Response (201 Created)
```json
{
  "knowledgeId": "00000000-0000-0000-0000-000000000042"
}
```

---

### 2. Update Knowledge Asset

`PATCH /v1/knowledge/:id`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | No | New title |
| `description` | string | No | New description |
| `labels` | string[] | No | New array of labels (replaces existing) |

#### Example Request
```bash
curl -X PATCH http://localhost:3000/v1/knowledge/00000000-0000-0000-0000-000000000042 \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Architecture Blueprint",
    "labels": ["v2", "architecture"]
  }'
```

---

### 3. Change Visibility

`POST /v1/knowledge/:id/visibility`

#### Request Body
```json
{
  "visibility": "public"
}
```

---

### 4. Import Knowledge Asset

`POST /v1/knowledge/:id/import`

#### Request Body
```json
{
  "sourceKind": "url",
  "sourceUri": "https://example.com/docs"
}
```

---

### 5. Soft Delete Knowledge Asset

`DELETE /v1/knowledge/:id`

#### Example Request
```bash
curl -X DELETE http://localhost:3000/v1/knowledge/00000000-0000-0000-0000-000000000042 \
  -H "x-tenant-id: 00000000-0000-0000-0000-000000000001"
```

---

### 6. Public Ingestion Webhook

`POST /v1/webhooks/knowledge`

#### Headers
| Header | Required | Value |
|---|---|---|
| `x-api-key` | **Yes** | Matching `WISDUM_API_KEY` |
| `x-tenant-id` | **Yes** | Target tenant UUID |

#### Request Body
```json
{
  "title": "Ingested Article",
  "type": "webpage",
  "content": "https://example.com/article.html",
  "visibility": "workspace"
}
```
