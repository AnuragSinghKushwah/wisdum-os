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

  it.each(['dev-secret-change-me', 'wisdum-prod-jwt-secret-replace-in-production'])(
    'rejects the publicly known default %s in every environment',
    (known) => {
      for (const environment of ['development', 'test', 'production'] as const) {
        expect(() => resolveJwtSecret(known, environment)).toThrow('publicly known default');
      }
    },
  );

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => resolveJwtSecret('short', 'development')).toThrow('at least 32 characters');
  });
});
