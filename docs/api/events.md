# Real-Time Event Streaming API Specification

Streams real-time domain event push notifications over Server-Sent Events (SSE).

## 1. Connect Event Stream (`GET /v1/events/stream`)

Opens a persistent HTTP connection streaming JSON event frames.

### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `events` | `string` | No | Comma-separated list of event names to filter |
| `once` | `string` | No | Set `true` for single-frame connection test |

### Example Request
```bash
curl -N http://localhost:3000/v1/events/stream \
  -H "authorization: Bearer $WISDUM_TOKEN"
```

### Event Stream Frame Payload
```text
: connected tenant=00000000-0000-4000-8000-000000000001

id: 00000000-0000-4000-8000-000000000099
event: knowledge.asset.created
data: {"id":"00000000-0000-4000-8000-000000000099","name":"knowledge.asset.created","version":1,"occurredAt":"2026-07-27T12:00:00.000Z","payload":{"title":"Test Asset"}}

: ping
```
