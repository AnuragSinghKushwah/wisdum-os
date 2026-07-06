# platform/

Platform capability packages — the cross-cutting capabilities every domain relies on, each isolated in its own package (see [ADR 0004](../docs/adr/0004-typescript-workspace-topology.md)):

| Package | Capability |
| --- | --- |
| [`auth/`](auth/) | Authentication and authorization |
| [`ai/`](ai/) | AI subsystem: reusable model-backed services |
| [`plugins/`](plugins/) | Plugin runtime: registration and lifecycle |
| [`search/`](search/) | Full-text and semantic search |
| [`storage/`](storage/) | Object and file storage |
| [`jobs/`](jobs/) | Background jobs and event delivery |

## Rules

- Capabilities depend on `packages/` (contracts, types, infrastructure), never on `apps/` or each other.
- Vendor-specific integrations live in the top-level `plugins/` directory and connect through provider contracts — no vendor SDKs here.
- Currently scaffolds: each package exposes its capability descriptor and no implementation.
