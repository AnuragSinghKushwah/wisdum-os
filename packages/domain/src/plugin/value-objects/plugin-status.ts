import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { PLUGIN_STATUSES } from '../types/plugin-types.js';
import type { PluginStatusValue } from '../types/plugin-types.js';

/**
 * Lifecycle state machine of a plugin installation. Plugins install
 * disabled; enabling is explicit. Uninstalled is terminal.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<PluginStatusValue, readonly PluginStatusValue[]>> = {
  installed: ['enabled', 'uninstalled'],
  enabled: ['disabled', 'uninstalled'],
  disabled: ['enabled', 'uninstalled'],
  uninstalled: [],
};

export class PluginStatus extends ValueObject<PluginStatus> {
  private constructor(private readonly status: PluginStatusValue) {
    super();
  }

  static create(value: string): PluginStatus {
    if (!(PLUGIN_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown plugin status: ${value}`, {
        value,
        allowed: [...PLUGIN_STATUSES],
      });
    }
    return new PluginStatus(value as PluginStatusValue);
  }

  static installed(): PluginStatus {
    return new PluginStatus('installed');
  }

  static enabled(): PluginStatus {
    return new PluginStatus('enabled');
  }

  static disabled(): PluginStatus {
    return new PluginStatus('disabled');
  }

  static uninstalled(): PluginStatus {
    return new PluginStatus('uninstalled');
  }

  get value(): PluginStatusValue {
    return this.status;
  }

  is(value: PluginStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: PluginStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof PluginStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
