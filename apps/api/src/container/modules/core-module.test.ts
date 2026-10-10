import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLlmProvider } from './core-module.js';

const PROVIDER_SETTINGS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'NVIDIA_API_KEY',
  'NVIDIA_BASE_URL',
  'OLLAMA_HOST',
  'REASONING_LLM_MODEL',
];

describe('createLlmProvider', () => {
  beforeEach(() => {
    // A developer's own .env or shell must not decide the outcome.
    for (const name of PROVIDER_SETTINGS) vi.stubEnv(name, '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses no provider when none is configured', () => {
    expect(createLlmProvider()).toBeUndefined();
  });

  it('selects NVIDIA NIM from NVIDIA_API_KEY, with no model until one is chosen', () => {
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');

    const selection = createLlmProvider();

    expect(selection?.name).toBe('nvidia-nim');
    expect(selection?.model).toBe('');
  });

  it('uses REASONING_LLM_MODEL for NVIDIA NIM exactly as written', () => {
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubEnv('REASONING_LLM_MODEL', 'nvidia/nemotron-3-super-120b-a12b');

    expect(createLlmProvider()?.model).toBe('nvidia/nemotron-3-super-120b-a12b');
  });

  it('selects a self-hosted NIM from NVIDIA_BASE_URL alone, since it needs no key', () => {
    vi.stubEnv('NVIDIA_BASE_URL', 'http://localhost:8000/v1');

    expect(createLlmProvider()?.name).toBe('nvidia-nim');
  });

  it('keeps the earlier providers ahead of NVIDIA NIM, and Ollama behind it', () => {
    vi.stubEnv('NVIDIA_API_KEY', 'nvapi-test');
    vi.stubEnv('OLLAMA_HOST', 'http://localhost:11434');
    expect(createLlmProvider()?.name).toBe('nvidia-nim');

    vi.stubEnv('GEMINI_API_KEY', 'gemini-test');
    expect(createLlmProvider()?.name).toBe('gemini');

    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    expect(createLlmProvider()?.name).toBe('openai');

    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    expect(createLlmProvider()?.name).toBe('anthropic');
  });
});
