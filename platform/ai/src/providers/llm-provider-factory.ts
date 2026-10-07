import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from './llm-provider.js';
import { GeminiLlmProvider } from './gemini-llm-provider.js';
import { OllamaLlmProvider } from './ollama-llm-provider.js';
import { OpenAiLlmProvider } from './openai-llm-provider.js';
import { AnthropicLlmProvider } from './anthropic-llm-provider.js';

export class LlmProviderFactory implements LlmProvider {
  private readonly gemini = new GeminiLlmProvider();
  private readonly ollama = new OllamaLlmProvider();

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const model = request.model.toLowerCase();

    if (model.startsWith('gemini') || process.env.GEMINI_API_KEY) {
      return this.gemini.complete(request);
    }
    if (model.startsWith('ollama') || model.startsWith('llama')) {
      return this.ollama.complete(request);
    }

    // Default to Gemini or local fallback provider
    return this.gemini.complete(request);
  }
}
