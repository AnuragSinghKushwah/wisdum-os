# 0020 — NVIDIA NIM as an AI provider

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Founding maintainer
- **Builds on:** [ADR 0014](0014-ai-provider-abstraction.md), [ADR 0019](0019-verify-the-ai-provider-and-size-output-for-thinking-models.md)

## Context

NVIDIA NIM serves open and NVIDIA models behind an OpenAI-compatible Chat Completions API: a hosted catalog at `https://integrate.api.nvidia.com/v1` (a key from build.nvidia.com, sent as a bearer token) and self-hostable NIM containers that expose the same API at their own address. The author wants to use it as the model behind content generation. Checking the hosted API on 2026-10-10 found three things that shape the integration:

- **Model ids are `namespace/name`** (`meta/llama-3.1-8b-instruct`, `nvidia/nemotron-3-super-120b-a12b`). The OpenAI adapter treats everything before the first `/` as a provider prefix and drops it, which would send NIM a name it does not know.
- **The catalog retires models.** `meta/llama-3.3-70b-instruct`, the usual choice not long ago, answers `410 Gone` ("reached its end of life on 2026-08-26"). A built-in default would go stale, as Gemini's did ([ADR 0019](0019-verify-the-ai-provider-and-size-output-for-thinking-models.md)).
- **Errors are plain.** A key NVIDIA does not accept answers `403 {"detail":"Authorization failed"}`, a missing one `401`, an unknown model `404 page not found`, a retired one `410`. The catalog also serves embedding, ranking, safety and parsing models that cannot write text.

## Decision

**Reuse the OpenAI-compatible adapter.** `NvidiaNimLlmProvider` (in `platform/ai`) wraps `OpenAiLlmProvider`, which gains one option, `verbatimModelIds`, so a model id is sent exactly as configured. The `openai` SDK client, pointed at NIM's address, is built in the composition root like the others.

**Selection.** `NVIDIA_API_KEY` selects NIM, after Anthropic, OpenAI and Gemini and before Ollama. `NVIDIA_BASE_URL` points the same adapter at a self-hosted NIM and, on its own, also selects it, because a self-hosted NIM asks for no key. The provider is named `nvidia-nim` in logs, the capabilities endpoint and error messages.

**No built-in model.** `REASONING_LLM_MODEL` must be set, with the id as shown on build.nvidia.com. When it is empty or wrong, the start-up check fails with that instruction and lists the models the account can use, with embedding, ranking, safety and parsing models filtered out. `npm run setup` says the same.

**Say what a retired model means.** A `410` is reported as "has retired the model … set `REASONING_LLM_MODEL`", with the available models listed. A connection failure that the SDK words only as "Connection error." is reported as unreachable. A `403` or `401` names `NVIDIA_API_KEY`.

**Keep reasoning out of drafts.** A reasoning model can put `<think>…</think>` in front of its answer. A block at the very start of the answer is removed by the NIM adapter; an unterminated one, or one that is not at the start, is left exactly as the model wrote it.

## Consequences

- Any model on the hosted catalog, or on a self-hosted NIM, can write drafts, with no per-model code.
- Whoever uses NIM has to choose a model once. Starting without one is a clear error, not a request for a guess that may be retired.
- Embeddings are unchanged: OpenAI when `OPENAI_API_KEY` is set, otherwise the local model. NIM is used for writing only.
- **Not yet exercised with a valid key.** The hosted API's error responses for a bad key, no key, an unknown model and a retired model were observed live, and the adapter was exercised end to end against an OpenAI-compatible stub. No NVIDIA key was available, so a real NIM completion has not been seen. Two things can only be learned from one: whether `<think>` blocks actually appear in `content` for the models people choose (some servers return reasoning in a separate field, which this adapter ignores), and whether a model rejects the 16,000-token output limit that drafts ask for (a model with a smaller output or context limit would fail that platform with the provider's own message). Pick a model with a large context window.
- The start-up check waits 30 seconds and runs once. A hosted model that queues for longer would show a red banner on a setup that works, and it stays until the API is restarted; `WISDUM_AI_CHECK=false` turns the check off.
