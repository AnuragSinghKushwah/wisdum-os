import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9a-z-]+(?:\.[0-9a-z-]+)*))?$/;

/**
 * Semantic version of a plugin (`major.minor.patch`, optional prerelease).
 * Build metadata is intentionally unsupported — versions must be totally
 * orderable for upgrade decisions.
 */
export class PluginVersion extends ValueObject<PluginVersion> {
  private constructor(
    private readonly _major: number,
    private readonly _minor: number,
    private readonly _patch: number,
    private readonly _prerelease?: string,
  ) {
    super();
  }

  static create(value: string): PluginVersion {
    const match = SEMVER_PATTERN.exec(value.trim().toLowerCase());
    if (match === null) {
      throw new ValidationError('Plugin version must be semver (`major.minor.patch`)', { value });
    }
    return new PluginVersion(Number(match[1]), Number(match[2]), Number(match[3]), match[4]);
  }

  get major(): number {
    return this._major;
  }

  get minor(): number {
    return this._minor;
  }

  get patch(): number {
    return this._patch;
  }

  get prerelease(): string | undefined {
    return this._prerelease;
  }

  isPrerelease(): boolean {
    return this._prerelease !== undefined;
  }

  /** Standard semver ordering; a prerelease sorts before its release. */
  compareTo(other: PluginVersion): number {
    if (this._major !== other._major) return this._major - other._major;
    if (this._minor !== other._minor) return this._minor - other._minor;
    if (this._patch !== other._patch) return this._patch - other._patch;
    if (this._prerelease === other._prerelease) return 0;
    if (this._prerelease === undefined) return 1;
    if (other._prerelease === undefined) return -1;
    return this._prerelease < other._prerelease ? -1 : 1;
  }

  isNewerThan(other: PluginVersion): boolean {
    return this.compareTo(other) > 0;
  }

  equals(other: unknown): boolean {
    return other instanceof PluginVersion && this.compareTo(other) === 0;
  }

  toString(): string {
    const base = `${this._major}.${this._minor}.${this._patch}`;
    return this._prerelease === undefined ? base : `${base}-${this._prerelease}`;
  }
}
