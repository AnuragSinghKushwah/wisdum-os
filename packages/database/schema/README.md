# schema/

Authoritative schema documentation for the primary PostgreSQL datastore.
Changes always arrive through versioned migrations in
[`../migrations/`](../migrations/), never by editing schema in place. Row
shapes are typed in [`../src/tables/`](../src/tables/).

## Tables by aggregate

| Aggregate | Tables | Tenant-scoped | Notes |
| --- | --- | --- | --- |
| Tenant | `tenants` | — (the root) | `slug` unique platform-wide |
| Organization | `organizations`, `organization_policies`, `organization_workspaces` | yes | `slug` unique platform-wide, not per tenant |
| Workspace | `workspaces`, `workspace_members`, `workspace_settings`, `workspace_feature_flags` | yes | `slug` unique per tenant; at least one owner enforced by the aggregate |
| User | `users` | yes | `email` unique per tenant; `role_ids` is a flat array pending the Identity schema pass |
| Knowledge | `knowledge`, `knowledge_labels`, `knowledge_content_references` | yes | `slug` unique per tenant; content lives behind content references |
| Document | `documents` | yes | dedup via unique `(tenant_id, content_hash_algorithm, content_hash_digest)` |
| Plugin | `plugins` | yes | `name` (`publisher/plugin`) unique per tenant |
| Conversation | `conversations`, `conversation_messages`, `conversation_message_tool_calls` | yes | messages are append-only, ordered by `message_index` |
| PromptTemplate | `prompt_templates` | yes | `name` unique per tenant; `revision` increments on every body change |
| SearchIndex | `search_indexes`, `search_index_documents` | yes | `name` unique per tenant; the physical index lives outside Postgres |

Every table other than `tenants` carries `tenant_id` and must be filtered by
it in every query.
