# Hybrid Search API Specification

Provides unified cognitive search combining BM25 keyword matching with pgvector dense embeddings.

## 1. Execute Search Query (`GET /v1/search`)

Performs search over tenant documents and knowledge assets.

### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `q` | `string` | **Yes** | Search query text |
| `mode` | `string` | No | Search mode (`hybrid`, `semantic`, `keyword`, default `hybrid`) |
| `limit` | `number` | No | Max results (default 20) |

### Example Request
```bash
curl -X GET "http://localhost:3000/v1/search?q=vector+architecture&mode=hybrid" \
  -H "authorization: Bearer $WISDUM_TOKEN"
```

### Response Schema (`200 OK`)
```json
[
  {
    "documentId": "00000000-0000-4000-8000-000000000010",
    "title": "System Architecture Overview",
    "snippet": "...dense vector search using PostgresVectorStore with cosine similarity...",
    "score": 0.94,
    "mode": "hybrid"
  }
]
```
