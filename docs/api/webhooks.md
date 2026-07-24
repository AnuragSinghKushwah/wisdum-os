# Webhook Ingestion API

This specification documents public endpoints for ingesting knowledge assets into Wisdum from external applications, scripts, integrations, or crawlers (Product Bible §5 & §6).

## 1. Unified Webhook Ingestion Endpoint (`POST /v1/webhooks/ingest`)

* **Method**: `POST`
* **Path**: `/v1/webhooks/ingest`
* **Default Port**: `3001`
* **URL**: `http://localhost:3001/v1/webhooks/ingest`

### Headers

| Header | Type | Required | Description |
| --- | --- | --- | --- |
| `Content-Type` | `string` | **Yes** | Must be `application/json` |
| `x-api-key` | `string` | **Yes** | Security token matching `WISDUM_API_KEY` (defaults to `dev-webhook-key`). |
| `x-tenant-id` | `string` | **Yes** | Tenant ID (e.g. `tenant-123`). |

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `string` | **Yes** | Source system (`github`, `notion`, `slack`, `email`, `custom`, `url`). |
| `title` | `string` | **Yes** | Human-readable title. |
| `content` | `string` | **Yes** | Text, markdown, JSON, or URL body. |
| `contentType` | `string` | No | MIME type (defaults to `text/markdown`). |
| `sourceUri` | `string` | No | Canonical link back to the source item. |
| `labels` | `string[]` | No | Categorization labels. |
| `triggerReasoningPass` | `boolean` | No | If `true`, runs the Core Loop reasoning engine immediately upon ingestion. |

### Response Schema (`201 Created` / `200 OK`)

```json
{
  "knowledgeId": "00000000-0000-0000-0000-000000000001",
  "documentId": "00000000-0000-0000-0000-000000000002",
  "isDuplicate": false,
  "status": "created",
  "reasoningResult": {
    "conceptsFound": 3,
    "insightsCreated": 1,
    "opportunitiesCreated": 2
  }
}
```

### CLI Example (cURL)

```bash
curl -X POST http://localhost:3001/v1/webhooks/ingest \
  -H "content-type: application/json" \
  -H "x-api-key: dev-webhook-key" \
  -H "x-tenant-id: tenant-123" \
  -d '{
    "source": "github",
    "title": "Release Notes v2.7",
    "content": "# Release Notes\nAdded Ingestion Engine and Webhook routes.",
    "sourceUri": "https://github.com/org/repo/releases/v2.7",
    "labels": ["github", "release"],
    "triggerReasoningPass": true
  }'
```
