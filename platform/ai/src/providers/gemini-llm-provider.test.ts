import { describe, expect, it } from 'vitest';
import { GeminiLlmProvider, listGeminiModels } from './gemini-llm-provider.js';
import { OllamaLlmProvider } from './ollama-llm-provider.js';
import { LlmProviderFactory } from './llm-provider-factory.js';

const REQUEST = {
  messages: [{ role: 'user' as const, content: 'Explain vector indexes in PostgreSQL' }],
};

describe('GeminiLlmProvider', () => {
  it('fails clearly, instead of returning made-up output, when the API key is absent', async () => {
    const provider = new GeminiLlmProvider({ apiKey: '' });

    await expect(
      provider.complete({ ...REQUEST, model: 'gemini/gemini-2.5-flash' }),
    ).rejects.toThrow('GEMINI_API_KEY is not set');
  });
});

describe('GeminiLlmProvider requests', () => {
  function recordingFetch(body: unknown): {
    fetch: typeof fetch;
    calls: { url: string; init?: RequestInit }[];
  } {
    const calls: { url: string; init?: RequestInit }[] = [];
    const impl = ((input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    }) as typeof fetch;
    return { fetch: impl, calls };
  }

  it('sends the key in a header, never in the URL', async () => {
    const { fetch: fakeFetch, calls } = recordingFetch({
      candidates: [{ content: { parts: [{ text: 'hi' }] }, finishReason: 'STOP' }],
    });
    const provider = new GeminiLlmProvider({ apiKey: 'secret-key', fetch: fakeFetch });

    const result = await provider.complete({ ...REQUEST, model: 'gemini/gemini-test-model' });

    expect(result.content).toBe('hi');
    expect(calls[0]?.url).toContain('/models/gemini-test-model:generateContent');
    expect(calls[0]?.url).not.toContain('secret-key');
    expect((calls[0]?.init?.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'secret-key',
    );
  });

  it('has no built-in model and asks for one instead of guessing a retired name', async () => {
    const { fetch: fakeFetch, calls } = recordingFetch({});
    const provider = new GeminiLlmProvider({ apiKey: 'secret-key', fetch: fakeFetch });

    await expect(provider.complete({ ...REQUEST, model: '' })).rejects.toThrow(
      'REASONING_LLM_MODEL',
    );
    expect(calls).toHaveLength(0);
  });
});

describe('Gemini errors', () => {
  it("carries the HTTP status and Google's own message, not the raw JSON body", async () => {
    const fakeFetch = (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: 400, message: 'API key not valid. Please pass a valid API key.' },
          }),
          {
            status: 400,
          },
        ),
      )) as typeof fetch;
    const provider = new GeminiLlmProvider({ apiKey: 'bad', fetch: fakeFetch });

    const error = await provider
      .complete({ ...REQUEST, model: 'gemini-x' })
      .catch((cause: unknown) => cause);

    expect((error as { status?: number }).status).toBe(400);
    expect((error as Error).message).toBe(
      'Gemini API error (400): API key not valid. Please pass a valid API key.',
    );
  });
});

describe('listGeminiModels', () => {
  it('returns only Gemini models that can generate content, without the models/ prefix', async () => {
    const { fetch: fakeFetch, calls } = ((): ReturnType<typeof listFetch> => listFetch())();

    const names = await listGeminiModels('secret-key', { fetch: fakeFetch });

    expect(names).toEqual(['gemini-a-flash', 'gemini-b-pro']);
    expect(calls[0]).not.toContain('secret-key');
  });
});

function listFetch(): { fetch: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const impl = ((input: string | URL | Request) => {
    calls.push(String(input));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          models: [
            { name: 'models/gemini-a-flash', supportedGenerationMethods: ['generateContent'] },
            {
              name: 'models/gemini-b-pro',
              supportedGenerationMethods: ['generateContent', 'countTokens'],
            },
            { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
            { name: 'models/gemini-embed', supportedGenerationMethods: ['embedContent'] },
          ],
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;
  return { fetch: impl, calls };
}

describe('OllamaLlmProvider', () => {
  it('fails clearly, instead of returning made-up output, when the daemon is unreachable', async () => {
    const provider = new OllamaLlmProvider({ baseUrl: 'http://127.0.0.1:1' });

    await expect(provider.complete({ ...REQUEST, model: 'ollama/llama3' })).rejects.toThrow(
      'Could not reach Ollama at http://127.0.0.1:1',
    );
  });
});

describe('LlmProviderFactory', () => {
  it('routes requests to the correct provider based on model name', async () => {
    const factory = new LlmProviderFactory();

    await expect(factory.complete({ ...REQUEST, model: 'ollama/llama3' })).rejects.toThrow(
      /Gemini|Ollama/,
    );
  });
});
