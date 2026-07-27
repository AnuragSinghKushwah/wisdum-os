# Identity & Authentication API Specification

Handles user registration, authentication, token verification, and API key management.

## 1. Authenticate User (`POST /v1/identity/login`)

Authenticates user credentials and returns a JWT bearer access token.

### Example Request
```bash
curl -X POST http://localhost:3000/v1/identity/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@wisdum.io",
    "password": "SecurePassword123!"
  }'
```

### Response Schema (`200 OK`)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "00000000-0000-4000-8000-000000000002",
  "tenantId": "00000000-0000-4000-8000-000000000001"
}
```

---

## 2. List API Keys (`GET /v1/identity/api-keys`)

Lists all active API keys configured for the tenant context.

### Example Request
```bash
curl -X GET http://localhost:3000/v1/identity/api-keys \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001"
```

### Response Schema (`200 OK`)
```json
[
  {
    "id": "00000000-0000-4000-8000-000000000088",
    "label": "CLI Integration Key",
    "status": "active",
    "createdAt": "2026-07-27T12:00:00.000Z"
  }
]
```

---

## 3. Create API Key (`POST /v1/identity/api-keys`)

Generates a new personal API key for programmatic integration.

### Example Request
```bash
curl -X POST http://localhost:3000/v1/identity/api-keys \
  -H "x-tenant-id: 00000000-0000-4000-8000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Scraper Key"
  }'
```

### Response Schema (`201 Created`)
```json
{
  "apiKeyId": "00000000-0000-4000-8000-000000000089",
  "plaintextKey": "wsk_live_9876543210abcdef"
}
```
