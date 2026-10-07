# Domain: Opportunity

> Implemented in [`packages/domain/src/opportunity/`](../../packages/domain/src/opportunity/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md).

## Purpose

Turns reasoning over the knowledge graph into content the tenant can publish. The context holds the chain of records from a conclusion to a published piece: an **insight** (what the reasoning found), an **opportunity** (a proposed piece of content based on it), a **content draft** (the generated first draft), and **published content** (what went out, with a view counter for the "measure" step).

## Entities

Four aggregate roots, each scoped to a tenant. They refer to each other by plain UUID, so none imports another.

| Aggregate | Meaning | Key state |
| --- | --- | --- |
| **Insight** | A reasoning conclusion. | `InsightSummary` (non-empty), the concept ids and source knowledge ids it rests on. Immutable after creation. |
| **Opportunity** | A proposed piece of content. | `insightId`, `OpportunityTitle`, `OpportunityRationale`, `OpportunityType`, `OpportunityStatus`. |
| **ContentDraft** | The generated first draft of an opportunity. | `opportunityId`, `ContentTitle`, `ContentBody` (Markdown, may be empty while drafting), `ContentDraftStatus`. |
| **PublishedContent** | The record of a publication. | `draftId`, `opportunityId`, `PublishedSlug`, title and body snapshot, `providerCapability` (for example `publishing.website`), `externalUrl`, `viewCount`, `publishedAt`. |

`OpportunityType` is one of `blog_post`, `linkedin_post`, `newsletter`, `youtube_script`, `course_module`, `book_chapter`, `architecture_document`, `research_paper`, `podcast_outline`, `trading_report`, `internal_documentation`, `product_specification`, `marketing_campaign`, `sales_content`, and is fixed at creation.

### Lifecycles

```
Opportunity:   proposed ──▶ drafted ──▶ published
                   │           │
                   └───────────┴──────▶ dismissed        (published and dismissed are terminal)

ContentDraft:  draft ──▶ published                       (published is terminal)
```

### Behaviors

- `Opportunity.markDrafted(contentDraftId)`, `markPublished(publishedContentId)`, `dismiss()`.
- `ContentDraft.updateContent(title, body)` and `markPublished()`.
- `PublishedContent.recordView()` increments `viewCount`. It raises no event, because view frequency is too high to publish as events.

### Invariants

- Status changes follow the maps above; an illegal move throws `InvariantViolationError`.
- A published draft cannot be edited.
- Value objects validate themselves: titles, rationale, and summary are non-empty and length-limited, the body is length-limited, the slug is lowercase letters, digits, and single hyphens, and ids must be UUIDs.
- Slug **uniqueness** within a tenant is a repository concern; the publish handler generates a unique slug.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `opportunity.insight.generated` | `Insight.create()` |
| `opportunity.opportunity.proposed` | `Opportunity.create()` |
| `opportunity.opportunity.drafted` | `markDrafted()` |
| `opportunity.opportunity.published` | `Opportunity.markPublished()` |
| `opportunity.opportunity.dismissed` | `dismiss()` |
| `opportunity.content-draft.created` | `ContentDraft.create()` |
| `opportunity.content-draft.published` | `ContentDraft.markPublished()` |
| `opportunity.published-content.created` | `PublishedContent.create()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

In [`packages/application/src/opportunity/`](../../packages/application/src/opportunity/):

- **Create:** `createOpportunityCommand` creates an insight and an opportunity together. The reasoning pass (`RunReasoningPassHandler`, in the reasoning context) creates the same records automatically.
- **Draft:** `generateContentDraftCommand` loads the opportunity and its insight, asks the model for a draft through the `LlmCompletionPort`, saves a `ContentDraft`, and marks the opportunity `drafted`.
- **Edit and dismiss:** `updateContentDraftCommand`, `dismissOpportunityCommand`.
- **Publish:** `publishContentDraftCommand` is idempotent per draft (a retry returns the existing record). It chooses a publishing capability from the opportunity type, confirms the capability is enabled for the tenant, publishes through the provider, then saves `PublishedContent` and marks the draft and opportunity `published`.
- **Read:** six queries to get and list opportunities, drafts, and published content. Fetching published content records a view.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/v1/opportunities` | List opportunities. |
| `POST` | `/v1/opportunities` | Create an insight and opportunity. |
| `GET` | `/v1/opportunities/:id` | Fetch one opportunity. |
| `POST` | `/v1/opportunities/:id/dismiss` | Dismiss it. |
| `POST` | `/v1/opportunities/:id/draft` | Generate a draft. |
| `GET` | `/v1/drafts`, `/v1/drafts/:id` | List and fetch drafts. |
| `PUT` | `/v1/drafts/:id` | Edit a draft. |
| `POST` | `/v1/drafts/:id/publish` | Publish a draft. |
| `GET` | `/v1/published`, `/v1/published/:id` | List and fetch published content. |
| `GET` | `/v1/dashboard/stats` | Dashboard counters. |

Details: [docs/api/opportunities.md](../api/opportunities.md). Routes are in `apps/api/src/routes/opportunity-routes.ts`.

## Persistence

Repository ports: `InsightRepository` (`findById`, `save`, `delete`), `OpportunityRepository` (`findById`, `listByTenant`, `save`, `delete`), `ContentDraftRepository` (`findById`, `findByOpportunityId`, `listByTenant`, `save`, `delete`), `PublishedContentRepository` (`findById`, `findBySlug`, `findByDraftId`, `listByTenant`, `save`, `delete`). Tables: `insights`, `opportunities`, `content_drafts`, `published_content` (migrations 0021 to 0025).

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`. The context has no specifications or domain services.

## Open questions

- **Publishing is not atomic.** The publish handler calls the external provider first, then saves `PublishedContent`, then the draft, then the opportunity, as separate saves with no transaction. If it fails after the provider call but before the first save, the content exists externally with no local record, and a retry publishes it a second time. If it fails after the first save, the published record exists while the draft is still `draft`, and the idempotent retry returns that record without finishing the transitions.
- The chosen publishing capability is decided in the application handler from the opportunity type, not in the domain.
- The context has no specifications, so rules such as "can this opportunity be dismissed" exist only as status-map lookups.
