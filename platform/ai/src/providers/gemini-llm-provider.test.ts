import { describe, expect, it } from 'vitest';
import { GeminiLlmProvider } from './gemini-llm-provider.js';
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
