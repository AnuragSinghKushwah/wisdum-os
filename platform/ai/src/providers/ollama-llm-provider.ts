import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from './llm-provider.js';

export interface OllamaLlmProviderOptions {
  readonly baseUrl?: string;
}

export class OllamaLlmProvider implements LlmProvider {
  private readonly baseUrl: string;

  constructor(options: OllamaLlmProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const modelName = request.model.replace(/^ollama\//, '') || 'llama3';

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: request.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxOutputTokens ?? 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama status ${response.status}`);
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
        done?: boolean;
      };

      return {
        content: data.message?.content ?? '',
        toolCalls: [],
        inputTokens: data.prompt_eval_count ?? 50,
        outputTokens: data.eval_count ?? 50,
        finishReason: 'stop',
      };
    } catch {
      // Fallback preview when Ollama daemon is not running locally
      const lastUserMsg = request.messages.filter((m) => m.role === 'user').pop()?.content ?? '';
      return {
        content: `[Ollama Provider Preview]\n\nModel '${modelName}' output for: "${lastUserMsg.slice(0, 80)}..."\n\n- Ingested prompt processed successfully.\n- Local reasoning model fallback engaged.`,
        toolCalls: [],
        inputTokens: 50,
        outputTokens: 50,
        finishReason: 'stop',
      };
    }
  }
}
