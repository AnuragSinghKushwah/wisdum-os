# Autonomous Agents API Specification

Manages background agent task execution and status tracking.

## 1. List Agent Tasks (`GET /v1/agents/tasks`)

Retrieves active and historical agent tasks.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/agents/tasks \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

---

## 2. Create Agent Task (`POST /v1/agents/tasks`)

Dispatches an autonomous agent task (writing or publishing).

### Example Request
```bash
curl -X POST http://localhost:3000/v1/agents/tasks \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "writing",
    "payload": { "topic": "pgvector scaling" }
  }'
```
