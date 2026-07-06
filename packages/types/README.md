# @wisdum/types

Foundational, domain-agnostic types: branded identifiers (`UUID`, `TenantId`, `IsoTimestamp`) and the `Result` type for explicit error passing across package boundaries.

## Boundaries

- Depends on nothing.
- Any package may depend on it.
- Application-specific types belong in `@wisdum/domain` or `@wisdum/contracts`, never here.
