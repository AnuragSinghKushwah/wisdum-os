# tools/

Development and operations utilities: code generators, lint rules (e.g. cross-domain import checks), migration helpers, release tooling, and local development scripts.

## Conventions

- One directory per tool, each with a README explaining what it does and when to run it.
- Tools may read anything in the repository but must not be imported by `apps/`, `packages/`, `services/`, or `plugins/` — they are development-time only.

## Tools

| Tool | Purpose |
| --- | --- |
| [`grant-system-role`](grant-system-role/README.md) | Give an existing user a tenant role (needed once for users created before roles were enforced). |
| [`stub-llm`](stub-llm/README.md) | An OpenAI-compatible stub model for trying content generation end to end without an API key. |
