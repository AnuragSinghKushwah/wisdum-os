# @wisdum/config

Typed access to environment configuration. Reads are explicit and fail fast: callers declare exactly which variables they need and receive a `ConfigurationError` when one is absent. `WISDUM_ENV` selects the runtime environment (see `.env.example`).

## Boundaries

- Depends on `@wisdum/errors` only.
- No application-specific configuration schemas — those belong to the package that owns them.
