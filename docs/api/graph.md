# Knowledge Graph API Specification

Exposes knowledge graph topology, extracted concepts, and co-occurrence relationship edges.

## 1. Get Graph Concepts (`GET /v1/graph/concepts`)

Retrieves concept nodes extracted from document assets.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/graph/concepts \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

### Response Schema (`200 OK`)
```json
[
  {
    "id": "concept-001",
    "name": "Knowledge Operations",
    "description": "Captured knowledge lifecycle management",
    "frequency": 14
  }
]
```

---

## 2. Get Graph Relationships (`GET /v1/graph/relationships`)

Retrieves graph relationship edges connecting co-occurring concepts.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/graph/relationships \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

### Response Schema (`200 OK`)
```json
[
  {
    "sourceConceptId": "concept-001",
    "targetConceptId": "concept-002",
    "weight": 8,
    "relationshipType": "co_occurrence"
  }
]
```
