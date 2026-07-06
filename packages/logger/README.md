# @wisdum/logger

The `Logger` interface is the stable API every package logs through. The bundled JSON-lines console transport is intentionally minimal; richer transports arrive with observability infrastructure.

## Boundaries

- Depends on nothing.
- Direct `console` use is lint-banned everywhere else in the workspace.
