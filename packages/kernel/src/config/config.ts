import { ConfigurationError } from '@wisdum/errors';
import { createToken } from '../di/token.js';

/**
 * Read-only configuration port. The kernel and modules request settings
 * through this interface; loading (env, files, secret stores) is an
 * infrastructure concern.
 */
export interface ConfigProvider {
  get(key: string): string | undefined;
  /** Missing keys are a configuration error, not a runtime surprise. */
  require(key: string): string;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
}

/** DI token under which the active ConfigProvider is registered. */
export const CONFIG_PROVIDER = createToken<ConfigProvider>('kernel.config-provider');

/** In-memory provider for composition roots and tests. */
export class StaticConfigProvider implements ConfigProvider {
  constructor(private readonly values: Readonly<Record<string, string>>) {}

  get(key: string): string | undefined {
    return this.values[key];
  }

  require(key: string): string {
    const value = this.values[key];
    if (value === undefined) {
      throw new ConfigurationError(`Missing required configuration key '${key}'`, { key });
    }
    return value;
  }

  getNumber(key: string): number | undefined {
    const value = this.values[key];
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new ConfigurationError(`Configuration key '${key}' is not a number`, { key, value });
    }
    return parsed;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.values[key];
    if (value === undefined) return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    throw new ConfigurationError(`Configuration key '${key}' is not a boolean`, { key, value });
  }
}
