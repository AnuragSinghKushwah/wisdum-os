# Plugin Marketplace API Specification

Manages installed plugins and manifest verification.

## 1. List Plugins (`GET /v1/plugins`)
Lists all installed and active plugins for the tenant context.

## 2. Validate Plugin Manifest (`POST /v1/plugins/manifest/validate`)
Performs pre-flight validation on a 3rd-party plugin manifest.

### Example Request
```bash
curl -X POST http://localhost:3000/v1/plugins/manifest/validate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-connector",
    "displayName": "Custom Connector",
    "version": "1.0.0",
    "description": "Syncs custom data into Wisdum",
    "capabilities": ["input_connector"],
    "permissions": ["read_content"]
  }'
```

### Response Schema (`200 OK`)
```json
{
  "isValid": true,
  "errors": [],
  "warnings": []
}
```
