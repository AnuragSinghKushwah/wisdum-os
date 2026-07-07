# migrations/

Versioned, sequential schema migrations. Every migration is reversible: each
`NNNN_description.up.sql` has a matching `NNNN_description.down.sql`, and the
down script is tested before merge (see CLAUDE.md).

Migrations never assign primary keys or timestamps by default — identifiers
come from the application's `IdGenerator` and timestamps from its `Clock`
(ADR 0007: the domain generates neither).

| Migration | Tables |
| --- | --- |
| `0001_create_tenants` | `tenants` |
| `0002_create_organizations` | `organizations`, `organization_policies`, `organization_workspaces` |
| `0003_create_workspaces` | `workspaces`, `workspace_members`, `workspace_settings`, `workspace_feature_flags` |
| `0004_create_users` | `users` |
| `0005_create_knowledge` | `knowledge`, `knowledge_labels`, `knowledge_content_references` |
| `0006_create_documents` | `documents` |
| `0007_create_plugins` | `plugins` |
| `0008_create_conversations` | `conversations`, `conversation_messages`, `conversation_message_tool_calls` |
| `0009_create_prompt_templates` | `prompt_templates` |
| `0010_create_search_indexes` | `search_indexes`, `search_index_documents` |
