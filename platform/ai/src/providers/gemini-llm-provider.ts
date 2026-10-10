import type {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmFinishReason,
  LlmProvider,
} from './llm-provider.js';

export interface GeminiLlmProviderOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  /** Injected in tests; defaults to the global `fetch`. */
  readonly fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * The models this key can use for text generation, as ids like `gemini-3.1-flash-lite`.
 * Used to help someone pick a model when theirs is missing or has been retired.
 */
/** Builds an error carrying the HTTP status and Google's own message rather than the raw JSON body. */
async function geminiError(response: Response, context = ''): Promise<Error> {
  const raw = await response.text();
  let message = raw.slice(0, 300);
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (typeof parsed.error?.message === 'string') message = parsed.error.message;
  } catch {
    // Not JSON: keep the start of the body.
  }
  return Object.assign(new Error(`Gemini API error (${response.status})${context}: ${message}`), {
    status: response.status,
  });
}

export async function listGeminiModels(
  apiKey: string,
  options: { readonly baseUrl?: string; readonly fetch?: typeof fetch } = {},
): Promise<readonly string[]> {
  const response = await (options.fetch ?? fetch)(`${options.baseUrl ?? DEFAULT_BASE_URL}/models`, {
    headers: { 'x-goog-api-key': apiKey },
  });
  if (!response.ok) {
    throw await geminiError(response, ' while listing models');
  }
  const data = (await response.json()) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
  };
  return (data.models ?? [])
    .filter((model) => model.supportedGenerationMethods?.includes('generateContent') === true)
    .map((model) => (model.name ?? '').replace(/^models\//, ''))
    .filter((name) => name.startsWith('gemini'));
}

export class GeminiLlmProvider implements LlmProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiLlmProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set, so Gemini cannot be used.');
    }

    // No default: Gemini retires models on a schedule, so a built-in name goes stale.
    const modelName = request.model.replace(/^gemini\//, '');
    if (!modelName) {
      throw new Error(
        'No Gemini model is set. Set REASONING_LLM_MODEL to a model your key can use (see ai.google.dev/gemini-api/docs/models).',
      );
    }
    const systemInstruction = request.messages.find((m) => m.role === 'system')?.content;
    const contents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // The key goes in a header, not the URL, so it cannot end up in logs or error messages.
    const url = `${this.baseUrl}/models/${modelName}:generateContent`;
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

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await geminiError(response);
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
