# tools/

Development and operations utilities: code generators, lint rules (e.g. cross-domain import checks), migration helpers, release tooling, and local development scripts.

## Conventions

- One directory per tool, each with a README explaining what it does and when to run it.
- Tools may read anything in the repository but must not be imported by `apps/`, `packages/`, `services/`, or `plugins/` — they are development-time only.

No tools exist yet.
