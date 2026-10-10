# 0019 — Verify the AI provider at start-up, and size output for thinking models

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Founding maintainer
- **Builds on:** [ADR 0017](0017-source-grounded-content-generation.md), [ADR 0018](0018-usable-local-deployment-and-honest-output.md)

## Context

Everything in ADR 0017 and 0018 was exercised with a stub model, because no AI provider key was available while building it. That left a real risk for the first person to put a key in `.env`: the first failure would show up on their first draft, as a raw status code and JSON body, with no hint of which setting to change. Reading the providers' current documentation (October 2026) found specific traps:

- **Gemini retires models on a schedule.** `gemini-2.5-flash`, the built-in Gemini default, is listed for shutdown on 16 October 2026, and there have been reports of earlier 404s. Any model name hard-coded now will go stale.
- **Claude's current models think by default, and thinking counts toward `max_tokens`.** Claude Sonnet 5.5 (`claude-sonnet-5-5`, confirmed as a current API ID, retirement not before September 2027) has adaptive thinking on and rejects `thinking: {type: "disabled"}` with a 400. A fixed output limit of 1,500 or 4,096 tokens can be partly consumed by thinking and cut a draft off mid-sentence, with nothing telling the author.
- **OpenAI's o-series and GPT-5 models reject `max_tokens`** and require `max_completion_tokens`.
- **Gemini's API key was sent in the request URL**, where proxies, logs and error messages can record it.
- A Gemini error for a bad key is an HTTP 400 with a JSON body, which a status-code check does not recognise as an authentication failure.

## Decision

**Check the provider when the API starts.** `CoreModule` asks the configured provider one tiny question in the background (256 output tokens, 30 second timeout) and records the result as `ok`, `failed` with a message, `pending` or `skipped` on the status the capabilities endpoint serves. It never delays or fails start-up, a provider supplied by a test is never asked, and `WISDUM_AI_CHECK=false` turns it off. A failure is logged and shown as a red banner on every dashboard page.

**Say what to do.** `describeAiFailure` turns a provider failure into an instruction: which setting to fix for rejected credentials (including Gemini's 400), that the model was not found with the models the account can use listed (each provider can list them), rate limit or credit exhaustion, an unreachable provider, or a missing model. The same text is used when a platform fails while creating content, replacing the raw status and body.

**No built-in Gemini model.** Gemini needs `REASONING_LLM_MODEL`; without it the check fails with that instruction and the list of models the key can use, and `npm run setup` says so. The Claude default stays `claude-sonnet-5-5`; OpenAI stays `gpt-4o-mini`, for which no shutdown was announced.

**Size output for thinking models.** Drafts ask for up to 16,000 output tokens and other completions 4,096 (they were 4,096 and 1,500); only tokens produced are billed. A draft the model cut off at its limit ends with a visible notice, not silently. The OpenAI provider sends `max_completion_tokens` for the o-series and GPT-5 models and `max_tokens` otherwise. The Gemini key is sent in the `x-goog-api-key` header, and the provider has no fallback model name.

## Consequences

- The first real call is verified, or fails with a specific, fixable reason, before anyone writes a draft. This was exercised against the live Anthropic, OpenAI and Gemini endpoints with a deliberately invalid key: each returned its real error, the check produced the right instruction, and the banner and per-platform messages showed it in the running app.
- **A valid key has still not been exercised.** Authentication is checked before a request body is validated, so an invalid key proves the network path, the SDKs and the error handling, but not that the request body is accepted. The first call with a real key is the first proof of that, and the start-up check is how it will be reported.
- The check costs one request of a few tokens per API start (none with `WISDUM_AI_CHECK=false`).
- Model names still need an owner: the Claude and OpenAI defaults will eventually retire too, and the same check will say so, with the models the account can use.
