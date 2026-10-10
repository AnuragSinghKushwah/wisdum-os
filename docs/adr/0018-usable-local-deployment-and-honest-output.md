# 0018 — A usable local deployment, and output that is never made up

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Founding maintainer
- **Builds on:** [ADR 0017](0017-source-grounded-content-generation.md)

## Context

[ADR 0017](0017-source-grounded-content-generation.md) made drafts come from the user's source text. Running the whole product the way a person would, on a real Postgres database with a real PDF, a real web page and real editing, found the same class of defect in more places, plus a few that stopped the product being used at all:

- **PDF upload never worked.** The route used the version 1 function API of `pdf-parse`; the pinned version is 2, which exports a class. Every PDF upload returned a 500. A scanned PDF with no text layer would also have been stored as an empty asset.
- **Saving a draft discarded its text.** For LinkedIn, YouTube and podcast drafts the editor split the body into guessed "slides" and "script" fields and, on every Save, rebuilt the body from them with fixed placeholder headers. A YouTube script in the model's `[Timestamp] / [Visual Cue]` format came back as three lines and an invented dialogue. The editor also showed invented defaults (a `#AI #KnowledgeOS` hashtag line, a fixed video-generation prompt).
- **"Publish" claimed things that did not happen.** The LinkedIn and X providers returned a fabricated URL (`…/urn:li:share:fake_…`) and the draft was recorded as published. Blog posts tried Ghost with a placeholder key and always failed with a 500; newsletters posted to a webhook that did not exist. The hosted-page provider returned the API's JSON endpoint instead of the shareable page.
- **Published content showed invented numbers.** Likes, comments, shares, CTR, read time and conversions were computed from the view count with arbitrary ratios and displayed, including on the public page.
- **First run was a dead end.** Sign-up closes once a tenant exists, so a database that already held a test tenant told the owner to "ask an administrator" when they were the administrator. There was no single command to run the stack, no way to create a stable session secret, and a launcher that left orphaned servers behind would have collided with the next run.
- Web pages were stored with their navigation and footers, which wastes the model's source budget; models often wrap a draft in a code fence; LinkedIn and X drafts carried YAML frontmatter and a carousel outline that cannot be pasted; Fastify client errors (an empty JSON body) came back as 500.

## Decision

**Run it with two commands.** `npm run setup` creates `.env`, generates a `JWT_SECRET` when it is missing or an obvious placeholder (never replacing a real one), and says which AI provider is configured. `npm run local` runs setup, starts Postgres and Redis with Docker when `.env` points at local ones that are not running (waiting for their health checks, not just an open port), then runs the API and web app together. Each child runs in its own process group so `Ctrl-C` stops the servers `npm` started. The API listens on `127.0.0.1` for this run (`HOST` sets the address; the default stays `0.0.0.0` for containers), so no one else on the network can reach it or spend the model key. `npm run local -- --signup` opens sign-up for that run only, for the first account or when a database already has a tenant; the closed-sign-up message now says so.

**Read PDFs properly.** `extractPdfText` uses the version 2 API, joins pages without page markers, and rejects a corrupt, password-protected or text-less (scanned) PDF with a message saying what to do. The upload route returns standard error envelopes. Web pages are reduced to their `<article>` or `<main>` element when there is one, with navigation, headers, footers and sidebars removed.

**Saving never changes text.** The draft editor is one Markdown editor with a preview, for every format. Save sends exactly what is in the editor. The structured carousel and teleprompter editors, and every invented default, are removed. An end-to-end test saves a draft of each format and asserts the stored body is unchanged; it fails against the previous editor.

**Publish only where it can.** The Wisdum-hosted page is always available and links to the shareable web page (`PUBLIC_BASE_URL`, default `http://localhost:3000`). Dev.to, Ghost and Substack register only when their credentials are set (`DEVTO_API_KEY`; `GHOST_ADMIN_API_URL` with `GHOST_API_KEY`; `SUBSTACK_WEBHOOK_URL`). The LinkedIn and X stubs are deleted: neither has an integration, so for them, and for newsletters without a webhook, "Publish" creates the hosted page and the author copies the text. The draft page says so.

**Only measured numbers.** The published-content DTO and both web pages expose the view count and nothing derived from it.

**Drafts are ready to use.** LinkedIn and X drafts are plain text meant to be pasted (no frontmatter, no Markdown, a character limit stated); the newsletter format no longer asks for "curated links" or an invented story. A fence that wraps the whole model answer is removed, but only when it cannot be confused with the draft's own code blocks (otherwise the text is left exactly as written). An empty answer fails that platform instead of saving a blank draft. The source budget is 60,000 characters (`WISDUM_SOURCE_BUDGET_CHARS` overrides it, between 2,000 and 400,000), and `POST /v1/knowledge/:id/generate` returns `sourceTruncated` so the UI can tell the author when a source was cut.

**Client errors are 4xx.** A Fastify error with a 4xx status (an empty JSON body, an unsupported media type) is returned with that status and code `bad_request`.

## Consequences

- A person can clone, run two commands, create an account, bring in real material (text, PDF, a web page), create drafts for several platforms, edit them without risk, copy or publish them, and find everything still there after a restart. This was exercised in a browser on a fresh Postgres database, with a stub model standing in for the AI provider.
- Publishing to LinkedIn and X is manual (copy and paste). A real integration needs an OAuth application and a posting token; it can be added as a provider that registers only when configured.
- The structured carousel preview is gone. If a carousel view returns, it must be a read-only rendering of the saved text, never something that rewrites it.
- A source longer than the budget is still cut, now with a visible notice. Long material needs chunking and retrieval.
- `npm run local` assumes Docker for the databases. Without Docker, remove `DATABASE_URL` and `REDIS_URL` from `.env` to run in memory, where data is lost on restart.
- Still open: `/readyz` reports connected without checking; the unused `LlmProviderFactory` routes everything to Gemini when `GEMINI_API_KEY` is set; the private-address check does not resolve DNS; and no real AI provider has been exercised yet, only a stub, so draft quality is unmeasured.
