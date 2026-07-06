# apps/

User-facing applications. Each app is a client of the platform APIs with no privileged access — anything an app can do, a third-party integration can do through the same APIs.

## Conventions

- One directory per application (e.g. `apps/web/`).
- Stack: Next.js, React, TypeScript, Tailwind CSS (see [ADR 0003](../docs/adr/0003-core-technology-stack.md)).
- No business logic — apps are composition layers that wire packages together and present state.
- Shared UI or client code used by more than one app is promoted to `packages/`.

## Applications

| App | Purpose |
| --- | --- |
| [`web/`](web/) | Web application composition root (bootstrap placeholder) |
| [`api/`](api/) | API application composition root (bootstrap placeholder) |
