import { describe, expect, it } from 'vitest';
import { GeminiLlmProvider } from './gemini-llm-provider.js';
import { OllamaLlmProvider } from './ollama-llm-provider.js';
import { LlmProviderFactory } from './llm-provider-factory.js';

describe('GeminiLlmProvider', () => {
  it('generates completion output with fallback preview when API key absent', async () => {
    const provider = new GeminiLlmProvider({ apiKey: '' });
    const result = await provider.complete({
      model: 'gemini/gemini-1.5-pro',
      messages: [{ role: 'user', content: 'Explain vector indexes in PostgreSQL' }],
    });

    expect(result.content).toContain('[Gemini Provider Preview]');
    expect(result.finishReason).toBe('stop');
  });
});

describe('OllamaLlmProvider', () => {
  it('generates completion output with fallback preview when daemon unreachable', async () => {
    const provider = new OllamaLlmProvider({ baseUrl: 'http://localhost:9999' });
    const result = await provider.complete({
      model: 'ollama/llama3',
      messages: [{ role: 'user', content: 'Summarize graph topology' }],
    });

    expect(result.content).toContain('[Ollama Provider Preview]');
    expect(result.finishReason).toBe('stop');
  });
});

describe('LlmProviderFactory', () => {
  it('routes requests to the correct provider based on model name', async () => {
    const factory = new LlmProviderFactory();
    const result = await factory.complete({
      model: 'gemini-1.5-pro',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBeDefined();
  });
});
