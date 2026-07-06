# apps/

User-facing applications. Each app is a client of the platform APIs with no privileged access — anything an app can do, a third-party integration can do through the same APIs.

## Conventions

- One directory per application (e.g. `apps/web/`).
- Stack: Next.js, React, TypeScript, Tailwind CSS (see [ADR 0003](../docs/adr/0003-core-technology-stack.md)).
- No business logic — apps orchestrate API calls and present state. Logic belongs in `services/`.
- Shared UI or client code used by more than one app is promoted to `packages/`.

No applications exist yet.
