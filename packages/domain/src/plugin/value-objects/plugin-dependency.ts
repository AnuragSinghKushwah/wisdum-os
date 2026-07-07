import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { PluginName } from './plugin-name.js';
import { PluginVersion } from './plugin-version.js';

// `1.2.3` (exact), `^1.2.3` (compatible), or `>=1.2.3` (minimum).
const RANGE_PATTERN = /^(\^|>=)?\d+\.\d+\.\d+(?:-[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/;

/**
 * A declared dependency on another plugin, with a version range. Range
 * grammar is deliberately small — exact, caret (same-major), or minimum —
 * so resolution stays predictable across the ecosystem.
 */
export class PluginDependency extends ValueObject<PluginDependency> {
  private constructor(
    private readonly _pluginName: PluginName,
    private readonly _range: string,
  ) {
    super();
  }

  static create(props: { pluginName: string; range: string }): PluginDependency {
    const range = props.range.trim().toLowerCase();
    if (!RANGE_PATTERN.test(range)) {
      throw new ValidationError('Dependency range must be `x.y.z`, `^x.y.z`, or `>=x.y.z`', {
        range: props.range,
      });
    }
    return new PluginDependency(PluginName.create(props.pluginName), range);
  }

  get pluginName(): PluginName {
    return this._pluginName;
  }

  get range(): string {
    return this._range;
  }

  /** Whether an installed version satisfies this dependency's range. */
  isSatisfiedByVersion(candidate: PluginVersion): boolean {
    const operator = this._range.startsWith('>=') ? '>=' : this._range.startsWith('^') ? '^' : '=';
    const base = PluginVersion.create(this._range.replace(/^(\^|>=)/, ''));
    switch (operator) {
      case '=':
        return candidate.compareTo(base) === 0;
      case '>=':
        return candidate.compareTo(base) >= 0;
      case '^':
        return candidate.major === base.major && candidate.compareTo(base) >= 0;
    }
  }

  equals(other: unknown): boolean {
    return (
      other instanceof PluginDependency &&
      other._pluginName.equals(this._pluginName) &&
      other._range === this._range
    );
  }

  toString(): string {
    return `${this._pluginName.value}@${this._range}`;
  }
}
