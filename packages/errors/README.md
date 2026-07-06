# @wisdum/errors

The platform error hierarchy. `WisdumError` carries a machine-readable `snake_case` code that surfaces unchanged in the API error envelope (see `docs/api/README.md`).

## Boundaries

- Depends on nothing.
- Domain- or capability-specific error subclasses live with their owning package, extending `WisdumError`.
