# Reasoning Engine API Specification

Triggers background concept-graph reasoning passes over tenant knowledge assets.

## 1. Run Reasoning Pass (`POST /v1/reasoning/pass`)

Executes an explicit concept co-occurrence and opportunity discovery pass.

### Example Request
```bash
curl -X POST http://localhost:3000/v1/reasoning/pass \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

### Response Schema (`200 OK`)
```json
{
  "status": "completed",
  "opportunitiesProposed": 3,
  "conceptsAnalyzed": 14
}
```
