# Domain: AI

> Implemented in [`packages/domain/src/ai/`](../../packages/domain/src/ai/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). How model providers are called is recorded in [ADR 0014](../adr/0014-ai-provider-abstraction.md).

## Purpose

Models the data around AI use without coupling to any vendor: which providers and models a tenant has registered, reusable prompt templates, and conversations as append-only transcripts with token accounting. Calling a model is not part of this context; that is the AI runtime in `platform/ai`. The domain records what was asked and what came back.

## Entities

Four aggregate roots, each scoped to a tenant.

| Aggregate | Meaning | Key state |
| --- | --- | --- |
| **AIProvider** | A registered provider (for example `anthropic`, `local-ollama`). | `ProviderName` (lowercase kebab-case), display name, enabled flag. |
| **AIModel** | A catalog entry for a model at a provider. | `ModelReference` (`provider/model`, for example `anthropic/claude-sonnet-5`), kind (`completion`, `embedding`, `ocr`, `speech`, `vision`), enabled flag, and a capability profile. |
| **PromptTemplate** | A reusable prompt. | Dot-namespaced kebab-case name (for example `knowledge.summarize`), description, `PromptBody` with `{{variable}}` placeholders, and a `revision` that increments on every body change. |
| **Conversation** | A transcript between a user or service account and a model. | `ModelReference`, owner id, optional title, status `active` or `archived`, an ordered list of `ConversationMessage`, and accumulated `TokenUsage`. |

Supporting value objects: `CompletionModel` and `EmbeddingModel` (context window and output limits), `ConversationMessage` (role `system`, `user`, `assistant`, or `tool`; immutable), `ToolCall` (a tool name, opaque JSON arguments and result, and a status of `pending`, `succeeded`, or `failed`), and `TokenUsage` (input, output, and total counts; accumulating produces a new value). Cost calculation is deliberately outside the domain.

### Conversation lifecycle

```
active ──▶ archived (terminal)
```

### Behaviors

- **Conversation:** `start`, `appendMessage`, `retitle`, `archive`, plus `messageCount` and `hasPendingToolCalls`.
- **AIProvider:** `register`, `enable`, `disable`, `rename`.
- **AIModel:** `register`, `enable`, `disable`.
- **PromptTemplate:** `create`, `updateBody`, `describe`, `render(variables)`.

### Invariants

- An archived conversation cannot be modified.
- Only assistant messages can carry tool calls.
- A completion model must have a completion profile, and an embedding model an embedding profile. A profile's output limit cannot exceed its context window.
- A prompt template's name must be dot-namespaced kebab-case, and rendering fails unless every placeholder in the body is supplied.
- Token counts must be non-negative integers; message content has a maximum length.
- Value objects validate their own formats (UUID ids, provider name, model reference, tool name).

## Events

### Published

| Event | Raised by |
| --- | --- |
| `ai.provider.registered` | `AIProvider.register()` |
| `ai.provider.enabled` | `AIProvider.enable()` |
| `ai.provider.disabled` | `AIProvider.disable()` |
| `ai.model.registered` | `AIModel.register()` |
| `ai.model.enabled` | `AIModel.enable()` |
| `ai.model.disabled` | `AIModel.disable()` |
| `ai.prompt-template.created` | `PromptTemplate.create()` |
| `ai.prompt-template.updated` | `updateBody()` |
| `ai.conversation.started` | `Conversation.start()` |
| `ai.conversation.message-appended` | `appendMessage()` (payload carries role, message index, and token counts) |
| `ai.conversation.archived` | `Conversation.archive()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `startConversationCommand` and `appendMessageCommand`, query `getConversationQuery`, and the `ConversationReadModel` port, in [`packages/application/src/ai/`](../../packages/application/src/ai/). Only conversations have use cases. The turn endpoint calls the conversation runtime in `platform/ai`, which builds context, calls the configured model, and appends the reply.

## Specifications

`AIModelIsAvailable`, `AIModelIsOfKind` (takes a kind), `AIModelSupportsTools`, `ConversationIsActive`, `ConversationAwaitsTools`, `ConversationExceedsTokenBudget` (takes a budget).

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/conversations` | Start a conversation. |
| `GET` | `/v1/conversations/:id` | Fetch a conversation. |
| `POST` | `/v1/conversations/:id/messages` | Append a message. |
| `POST` | `/v1/conversations/:id/turns` | Run a model turn. Fails with a configuration error when no AI provider key is set. |

Details: [docs/api/ai.md](../api/ai.md). Routes are in `apps/api/src/routes/ai-routes.ts`.

## Persistence

Repository ports: `AIProviderRepository` (`findById`, `findByName`, `findAll`, `save`, `delete`), `AIModelRepository` (`findById`, `findByReference`, `findByKind`, `save`, `delete`), `PromptTemplateRepository` (`findById`, `findByName`, `findAll`, `save`, `delete`), `ConversationRepository` (`findById`, `findByOwner`, `save`, `delete`). Tables: `conversations`, `conversation_messages`, `conversation_message_tool_calls`, `prompt_templates`, `ai_providers`, `ai_models` (migrations 0008, 0009, 0015, 0016).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`.

## Open questions

- **Providers, models, and prompt templates are modelled but unused.** No use case, route, or composition code registers an `AIProvider` or `AIModel`, creates a `PromptTemplate`, or renders one. The runtime selects its provider from environment variables, not from this catalog, so the registered-provider concept is not yet connected to what actually runs.
- `retitle` and `archive` on a conversation have no use case or route.
- The domain describes providers as arriving as plugins, but the current provider adapters are built into `platform/ai` ([ADR 0013](../adr/0013-plugin-system-sdk-runtime-and-sandbox.md)).
