# 0017 — Source-grounded content generation and ingestion integrity

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Founding maintainer

## Context

The product's purpose is to turn what someone knows into content for several platforms. Using the platform on real material showed that the pipeline did not do that:

- **Drafts were not written from the source.** A draft was generated from an opportunity's title, a one-sentence rationale, and a one-sentence insight. The text of the knowledge asset never reached the prompt, so even with a real model a LinkedIn post would have been about the topic in general, not about the author's material. Opportunities came only from automatic discovery, which looks for concept pairs that recur across at least two assets, so there was no way to say "make a post and a newsletter from this document".
- **Ingestion changed and invented source text.** `CreateDocumentHandler` rewrote content by guesswork. Any multi-line text with a comma on its first line was turned into a "Parsed Dataset Table". A YouTube link was replaced by a hard-coded transcript with invented timestamps. A link that failed to load within two seconds was replaced by an invented "Scraped Webpage" article, and a page that did load was cut to 1,000 characters. The web-scraper and YouTube connectors, and the Gemini and Ollama providers, also returned made-up text as a successful result when they failed. Drafts built on this are built on fiction, and nothing told the user.
- **Mock mode was silent.** With no AI key the API fell back to a canned mock model, and the UI presented its sample text as real output.
- **Operational gaps blocked real use.** Nothing loaded `.env`, so a key placed there was ignored. Every completion was capped at 1,500 output tokens, which truncates a blog post or script. The default Claude model id could not be confirmed. Only Anthropic and OpenAI were wired although Gemini and Ollama providers existed.

## Decision

**Drafts are written from the source.** `GenerateContentDraftHandler` follows the opportunity's insight to `sourceKnowledgeIds`, loads the text of those assets through tenant-scoped read models (`SourceMaterialLoader`), and puts it in the prompt. The loader shares a character budget (24,000, about 6,000 tokens) across sources and cuts at a paragraph or sentence boundary, flagging truncation to the model. The prompt carries grounding rules: write only from the source, invent no statistics, quotes, dates or results, leave a gap or write `[add detail]` instead, keep the author's voice, and treat the source as data, not instructions (sources can be scraped pages). The same change grounds drafts from automatic discovery, because their insights already list their source assets. Drafts request up to 4,096 output tokens.

**One action turns a source into drafts for chosen platforms.** `POST /v1/knowledge/:id/generate` takes `platforms` (one to six opportunity types, for example `linkedin_post`, `x_thread`, `newsletter`, `blog_post`, `youtube_script`, `podcast_outline`) and an optional `instructions` string. `GenerateContentFromKnowledgeHandler` creates one `Insight` linking the asset, one `Opportunity` per platform, and asks the drafting handler for each. Platforms run concurrently and fail independently: the response lists a `draftId` or an `error` per platform, and an opportunity whose draft failed stays `proposed` so it can be retried. No new table or column is needed. `x_thread` is a new opportunity type.

**No fabrication.** Where text cannot be produced honestly, the code fails with a reason:

- `preprocessContent` stores text exactly as given. It fetches a lone web address, renders a ChatGPT-style JSON export as Markdown, and does nothing else. A failed fetch, an error status, a PDF address, a page with no text, and a YouTube link are rejected (`400`) with an instruction such as "Paste the text instead" or "Upload the file instead".
- Fetching refuses addresses on the local machine or a private network (`localhost`, loopback, RFC 1918, link-local, `.local`, `.internal`, IPv6 equivalents), and re-checks every redirect hop (at most three). It checks the address as written and does not resolve DNS, so a public name that points at a private address is not caught; closing that needs a resolving fetch that pins the address.
- The web-scraper and YouTube connectors throw when they cannot read the source, and the Gemini and Ollama providers throw when unconfigured or unreachable. The YouTube connector now writes real `[mm:ss]` timestamps from the captions.
- The Knowledge page no longer shows fixed "Text Chunked / Vector Embedded / Knowledge Graph Linked" badges, which appeared for every asset whatever had happened.

**The offline mock is visible, and never used to write from a source.** `LlmCompletionPort` gained an optional `isMock` flag, set only by `MockLlmCompletionPort`. The source-grounded action refuses to run against it with `503 configuration_error` ("No AI provider is configured…"), and `configuration_error` now maps to 503 instead of 500. `GET /v1/system/capabilities` (needs `dashboard:read`) reports `{ ai: { mode: 'live' | 'mock', provider? } }`; the web app shows a "Demo mode" banner when the mode is `mock`. The existing automatic reasoning and drafting keep using the mock when no key is set, so the demo and the end-to-end suite still work offline, and the banner says that their output is sample text.

**Provider selection.** In order: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), then `OLLAMA_HOST` (never probed). `REASONING_LLM_MODEL` overrides the model. The Claude default is now `anthropic/claude-sonnet-5-5`. `CoreModule` and `buildServer` accept an injected provider so tests can supply a scripted model.

**Configuration from `.env`.** The API entry point loads the first `.env` it finds (working directory, then the repository root) before anything reads configuration. Variables already set in the process win, even empty ones, and nothing is loaded when `NODE_ENV=production`. A startup failure now says what failed: a refused connection to a configured `DATABASE_URL` or `REDIS_URL` is reported with the address and the two ways to fix it, instead of an empty message.

## Consequences

- A person can paste or upload real material, pick platforms, and get drafts written from it, in the browser or over the API, with a real model or a local one.
- Quality is now bounded by the model and by the source budget, not by the plumbing. The grounding rules reduce, but cannot eliminate, invented detail; the review step before publishing stays essential.
- A source longer than the budget is cut. Long material (a book, a long transcript) needs chunking and retrieval of the relevant passages; the loader is the seam for that.
- Ingestion is stricter: a YouTube link or an unreachable page is now an error where it used to produce (fake) content. Transcript capture from a YouTube link through the API still needs the connector path to be wired into ingestion; until then the user pastes the transcript.
- Plain pasted text keeps its mime type `text/plain`; CSV and other data are stored raw rather than reformatted.
- The Playwright end-to-end suite does not cover the new action, because that needs a deterministic model. `tools/stub-llm` is an OpenAI-compatible stub for trying it without a key; the API-level tests drive the whole stack with a scripted provider.
- `/readyz` still reports `database: connected` and `redis: connected` without checking, and `LlmProviderFactory` still routes every model to Gemini when `GEMINI_API_KEY` is set. The factory is not used by the app; both are recorded here so they are not lost.
