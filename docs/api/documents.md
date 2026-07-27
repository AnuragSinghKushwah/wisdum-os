# Document API Specification

Provides endpoints for creating, retrieving, and processing raw document assets in Wisdum OS.

## 1. Create Document (`POST /v1/documents`)

Uploads or registers a new document for processing into the knowledge pipeline.

### Request Headers
| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `x-tenant-id` | `string (UUID)` | **Yes** | Tenant boundary context |
| `Content-Type` | `string` | **Yes** | `application/json` |

### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | Document title |
| `content` | `string` | **Yes** | Raw document text content |
| `contentType` | `string` | No | Content MIME type (default `text/markdown`) |

### Example Request
```bash
curl -X POST http://localhost:3000/v1/documents \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Architecture Overview",
    "content": "# System Architecture\nWisdum is an open-source Knowledge Operations Platform."
  }'
```

### Response Schema (`201 Created`)
```json
{
  "documentId": "00000000-0000-4000-8000-000000000010"
}
```

---

## 2. Get Document (`GET /v1/documents/:id`)

Retrieves a document asset by ID.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/documents/00000000-0000-4000-8000-000000000010 \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

### Response Schema (`200 OK`)
```json
{
  "id": "00000000-0000-4000-8000-000000000010",
  "title": "System Architecture Overview",
  "content": "# System Architecture\nWisdum is an open-source Knowledge Operations Platform.",
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "status": "processed",
  "createdAt": "2026-07-27T12:00:00.000Z"
}
```
