import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmFinishReason,
  LlmProvider,
} from './llm-provider.js';

export interface GeminiLlmProviderOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
}

export class GeminiLlmProvider implements LlmProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GeminiLlmProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.baseUrl = options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set, so Gemini cannot be used.');
    }

    const modelName = request.model.replace(/^gemini\//, '') || 'gemini-1.5-pro';
    const systemInstruction = request.messages.find((m) => m.role === 'system')?.content;
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const url = `${this.baseUrl}/models/${modelName}:generateContent?key=${this.apiKey}`;
    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxOutputTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
        finishReason?: string;
      }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const firstCandidate = data.candidates?.[0];
    const textOutput = firstCandidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const finishReason: LlmFinishReason =
      firstCandidate?.finishReason === 'MAX_TOKENS' ? 'length' : 'stop';

    return {
      content: textOutput,
      toolCalls: [],
      inputTokens: data.usageMetadata?.promptTokenCount ?? 100,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 100,
      finishReason,
    };
  }
}
