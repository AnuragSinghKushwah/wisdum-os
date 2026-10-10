import { describe, expect, it } from 'vitest';
import { describeStartupError } from './startup-error.js';

function refusedConnection(port: number): AggregateError {
  return new AggregateError(
    [
      Object.assign(new Error(''), { code: 'ECONNREFUSED', address: '::1', port }),
      Object.assign(new Error(''), { code: 'ECONNREFUSED', address: '127.0.0.1', port }),
    ],
    '',
  );
}

describe('describeStartupError', () => {
  it('names the unreachable address and how to fix a configured database', () => {
    const message = describeStartupError(refusedConnection(5432), {
      DATABASE_URL: 'postgresql://x',
    });

    expect(message).toContain('::1:5432');
    expect(message).toContain('DATABASE_URL is set');
    expect(message).toContain('npm run docker:up');
  });

  it('mentions both variables when both are set', () => {
    const message = describeStartupError(refusedConnection(5432), {
      DATABASE_URL: 'postgresql://x',
      REDIS_URL: 'redis://y',
    });

    expect(message).toContain('DATABASE_URL and REDIS_URL are set');
  });

  it('does not blame configuration that is not set', () => {
    const message = describeStartupError(refusedConnection(5432), { DATABASE_URL: '' });

    expect(message).toBe('Could not connect to ::1:5432: connection refused.');
  });

  it('passes an ordinary error message through', () => {
    expect(describeStartupError(new Error('bad config'), {})).toBe('bad config');
  });

  it('never returns an empty string', () => {
    expect(describeStartupError(new AggregateError([new Error('')], ''), {})).not.toBe('');
  });
});
