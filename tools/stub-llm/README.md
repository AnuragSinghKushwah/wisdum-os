# stub-llm

An OpenAI-compatible stand-in for a model, for trying "create content from source" end to end without an API key.

It answers every request with a labelled stub that reports what the model was sent — the platform format, how many characters of source arrived, the first line of the source, and any author instructions. It does not write real content.

```bash
node tools/stub-llm/stub-llm.mjs                      # listens on :4010
OPENAI_API_KEY=stub OPENAI_BASE_URL=http://localhost:4010/v1 npm run dev:api
```

Use it to check wiring, permissions and the UI. Use a real provider key (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` or `OLLAMA_HOST`) to judge the quality of the drafts.
