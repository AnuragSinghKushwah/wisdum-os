import { describe, expect, it } from 'vitest';
import { resolveJwtSecret } from '../jwt-secret.js';

const STRONG = 'k'.repeat(40);

describe('resolveJwtSecret', () => {
  it('uses a configured secret as-is', () => {
    expect(resolveJwtSecret(STRONG, 'production')).toEqual({ secret: STRONG, generated: false });
  });

  it('refuses to start in production without a secret', () => {
    expect(() => resolveJwtSecret(undefined, 'production')).toThrow('JWT_SECRET must be set');
    expect(() => resolveJwtSecret('', 'production')).toThrow('JWT_SECRET must be set');
  });

  it.each(['development', 'test'] as const)(
    'generates a throwaway secret in %s when none is configured',
    (environment) => {
      const resolved = resolveJwtSecret(undefined, environment, () => 'generated-secret');
      expect(resolved).toEqual({ secret: 'generated-secret', generated: true });
    },
  );

  it('generates a different secret each time by default', () => {
    const first = resolveJwtSecret(undefined, 'development').secret;
    const second = resolveJwtSecret(undefined, 'development').secret;
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
  });

  it.each([
    'dev-secret-change-me',
    'wisdum-prod-jwt-secret-replace-in-production',
    'change-this-to-a-secure-random-64-char-secret-in-production',
  ])('rejects the publicly known default %s in every environment', (known) => {
    for (const environment of ['development', 'test', 'production'] as const) {
      expect(() => resolveJwtSecret(known, environment)).toThrow('publicly known default');
    }
  });

  it.each([
    'please-change-this-to-something-random-and-long',
    'replace_with_a_real_secret_value_of_decent_length',
    'my-placeholder-secret-that-is-long-enough-to-pass',
  ])('rejects the unreplaced placeholder %s', (placeholder) => {
    expect(() => resolveJwtSecret(placeholder, 'production')).toThrow('placeholder');
  });

  it('accepts a real random secret', () => {
    expect(
      resolveJwtSecret(
        '3f9c1e7a5b2d4c68a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a39281706f5e',
        'production',
      ).generated,
    ).toBe(false);
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => resolveJwtSecret('short', 'development')).toThrow('at least 32 characters');
  });
});
