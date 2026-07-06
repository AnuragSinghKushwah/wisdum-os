# plugins/

External provider integrations. Anything vendor-specific lives here, behind provider contracts defined in `packages/` — the core platform stays vendor-independent and self-hostable.

## Provider categories

- AI providers
- Authentication providers
- Search providers
- Storage providers
- Publishing providers
- Analytics providers

## Conventions

- One directory per plugin (e.g. `plugins/ai-anthropic/`, `plugins/search-meilisearch/`).
- A plugin implements a provider contract from `packages/`; it never reaches into `services/` internals.
- Plugins may subscribe to domain events as their integration surface.
- Each plugin documents its configuration and required credentials in its own README.

No plugins exist yet — the provider contracts they implement will be designed first (with ADRs).
