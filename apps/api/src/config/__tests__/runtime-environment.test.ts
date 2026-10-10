import { describe, expect, it } from 'vitest';
import { resolveRuntimeEnvironment } from '../runtime-environment.js';

describe('resolveRuntimeEnvironment', () => {
  it('defaults to development', () => {
    expect(resolveRuntimeEnvironment({})).toBe('development');
  });

  it('honours WISDUM_ENV', () => {
    expect(resolveRuntimeEnvironment({ WISDUM_ENV: 'test' })).toBe('test');
    expect(resolveRuntimeEnvironment({ WISDUM_ENV: 'production' })).toBe('production');
  });

  it('treats NODE_ENV=production as production even when WISDUM_ENV disagrees', () => {
    expect(resolveRuntimeEnvironment({ NODE_ENV: 'production' })).toBe('production');
    expect(resolveRuntimeEnvironment({ NODE_ENV: 'production', WISDUM_ENV: 'development' })).toBe(
      'production',
    );
  });

  it('does not let a non-production NODE_ENV relax WISDUM_ENV=production', () => {
    expect(resolveRuntimeEnvironment({ NODE_ENV: 'development', WISDUM_ENV: 'production' })).toBe(
      'production',
    );
  });
});
