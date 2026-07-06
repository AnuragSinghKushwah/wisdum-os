# services/

Backend domain services. Each domain is self-contained, owns its data, and communicates with other domains **only through events** — never direct imports.

## Domain layout

```
services/<domain-name>/
├── __init__.py
├── models.py           # Domain entities
├── schemas.py          # Request/response schemas
├── repository.py       # Data access layer
├── service.py          # Business logic
├── events.py           # Domain events
├── routes.py           # API endpoints (if applicable)
└── tests/
    ├── test_models.py
    ├── test_service.py
    ├── test_repository.py
    └── conftest.py     # Shared fixtures
```

## Rules

- Stack: FastAPI, async-first Python 3.11+ (see [ADR 0003](../docs/adr/0003-core-technology-stack.md)).
- No cross-domain imports; shared code is promoted to `packages/`.
- No vendor SDKs — use provider contracts implemented by `plugins/`.
- Every domain ships with its documentation in [`docs/domains/`](../docs/domains/) and, for new domains, an ADR establishing the boundary.
- All persistence goes through the repository layer; all queries are tenant-scoped.

No domains are implemented yet.
