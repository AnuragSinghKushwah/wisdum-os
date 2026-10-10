# Autonomous Agents API Specification

Manages background agent task execution and status tracking.

## 1. List Agent Tasks (`GET /v1/agents/tasks`)

Retrieves active and historical agent tasks.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/agents/tasks \
  -H "authorization: Bearer $WISDUM_TOKEN"
```

---

## 2. Create Agent Task (`POST /v1/agents/tasks`)

Dispatches an autonomous agent task (writing or publishing).

### Example Request
```bash
curl -X POST http://localhost:3000/v1/agents/tasks \
  -H "authorization: Bearer $WISDUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentType": "writing",
    "payload": { "topic": "pgvector scaling" }
  }'
```
