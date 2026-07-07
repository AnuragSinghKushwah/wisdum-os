import { ConfigurationError } from '@wisdum/errors';
import type { ConfigProvider } from '@wisdum/kernel';

/** Reads configuration from `process.env` (or an injected source for tests). */
export class EnvConfigProvider implements ConfigProvider {
  constructor(
    private readonly source: Readonly<Record<string, string | undefined>> = process.env,
  ) {}

  get(key: string): string | undefined {
    return this.source[key];
  }

  require(key: string): string {
    const value = this.source[key];
    if (value === undefined || value === '') {
      throw new ConfigurationError(`Missing required configuration key '${key}'`, { key });
    }
    return value;
  }

  getNumber(key: string): number | undefined {
    const value = this.source[key];
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new ConfigurationError(`Configuration key '${key}' is not a number`, { key, value });
    }
    return parsed;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.source[key];
    if (value === undefined) return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw new ConfigurationError(`Configuration key '${key}' is not a boolean`, { key, value });
  }
}
