import { describe, expect, it } from 'vitest';
import { TokenUsage } from './token-usage.js';

describe('TokenUsage', () => {
  it('zero() has no tokens', () => {
    expect(TokenUsage.zero().totalTokens).toBe(0);
  });

  it('totalTokens is the sum of input and output', () => {
    const usage = TokenUsage.create({ inputTokens: 10, outputTokens: 5 });
    expect(usage.totalTokens).toBe(15);
  });

  it('add() accumulates two usages', () => {
    const a = TokenUsage.create({ inputTokens: 10, outputTokens: 5 });
    const b = TokenUsage.create({ inputTokens: 3, outputTokens: 2 });
    const total = a.add(b);
    expect(total.inputTokens).toBe(13);
    expect(total.outputTokens).toBe(7);
    expect(total.totalTokens).toBe(20);
  });

  it('rejects negative or non-integer token counts', () => {
    expect(() => TokenUsage.create({ inputTokens: -1, outputTokens: 0 })).toThrow();
    expect(() => TokenUsage.create({ inputTokens: 1.5, outputTokens: 0 })).toThrow();
  });
});
