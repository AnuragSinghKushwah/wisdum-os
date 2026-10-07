# 0014 — AI provider abstraction

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. Implemented in `e6115f0` (Sprint 010); the Gemini and Ollama adapters and `LlmProviderFactory` arrived later and are not yet wired in. Rationale is reconstructed from the code and history.

## Context

AI is a first-class subsystem, and the project must avoid vendor lock-in. The platform needs text completion for conversations and the reasoning pipeline, embeddings for semantic search ([ADR 0010](0010-search-postgresql-full-text-and-pgvector.md)), and room for OCR, speech, and vision later.

## Decision

- **Vendor-neutral ports in `platform/ai`:** `LlmProvider` (completion), `EmbeddingProvider`, and interfaces for OCR, speech, vision, and tool providers. A conversation runtime, context builder, and memory store sit on top of the ports.
- **One adapter per vendor.** LLM adapters exist for Anthropic, OpenAI, Gemini, and Ollama; embedding adapters for OpenAI and a local in-process model.
- **Vendor SDK clients are constructed only in the composition root.** Adapters receive the client; `CoreModule` builds it and picks the completion provider from the environment: Anthropic when `ANTHROPIC_API_KEY` is set, otherwise OpenAI when `OPENAI_API_KEY` is set, otherwise none, in which case AI features degrade rather than fail startup. The model name is overridable with `REASONING_LLM_MODEL`.
- **Application handlers never call a model.** Single-shot completions go through the application's `LlmCompletionPort`. Conversation handlers only persist messages; the `platform/ai` conversation runtime is wired alongside them in `AiModule`. The domain's `ai` context models providers, models, prompt templates, and conversations as data.

## Consequences

- Switching or adding a vendor touches an adapter and the composition root, not use-case code.
- With neither API key set, there is no completion provider; code paths must handle `undefined`.
- **Gemini and Ollama cannot be selected today.** Their adapters exist, but the composition root only knows Anthropic and OpenAI.
- **`LlmProviderFactory` is unwired and mis-routes.** Neither the API nor the application layer references it, and its routing is wrong: when `GEMINI_API_KEY` is set, every request goes to Gemini regardless of the requested model, and it never routes to Anthropic or OpenAI although it imports them. It also reads `process.env` directly instead of going through `@wisdum/config`. Routing should key off the requested model or the configured provider, not the presence of an API key.
- The adapters live in `platform/ai` and are not loaded as plugins, contrary to the capability description there ([ADR 0013](0013-plugin-system-sdk-runtime-and-sandbox.md)).

## Alternatives considered

- **A multi-provider gateway service.** Not taken; the in-process ports are simpler and keep self-hosting free of extra services.
- **Calling vendor SDKs from handlers.** Rejected: it would spread vendor types through the application layer and block provider substitution.
