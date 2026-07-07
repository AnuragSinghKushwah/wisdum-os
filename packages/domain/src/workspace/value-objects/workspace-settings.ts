import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import type { WorkspaceSettingValue } from '../types/workspace-types.js';

const SETTING_KEY_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*)*$/;
const MAX_SETTINGS = 200;

/**
 * The workspace's configuration as an immutable key-value map. Keys are
 * dot-namespaced kebab-case (e.g. `knowledge.default-visibility`); values
 * are JSON scalars. Updating a setting produces a new value object.
 */
export class WorkspaceSettings extends ValueObject<WorkspaceSettings> {
  private constructor(private readonly settings: Readonly<Record<string, WorkspaceSettingValue>>) {
    super();
  }

  static create(settings: Record<string, WorkspaceSettingValue> = {}): WorkspaceSettings {
    const entries = Object.entries(settings);
    if (entries.length > MAX_SETTINGS) {
      throw new ValidationError(`Workspace cannot hold more than ${MAX_SETTINGS} settings`, {
        count: entries.length,
      });
    }
    for (const [key] of entries) {
      if (!SETTING_KEY_PATTERN.test(key)) {
        throw new ValidationError('Setting keys must be dot-namespaced kebab-case', { key });
      }
    }
    return new WorkspaceSettings(Object.freeze({ ...settings }));
  }

  static empty(): WorkspaceSettings {
    return new WorkspaceSettings(Object.freeze({}));
  }

  get(key: string): WorkspaceSettingValue | undefined {
    return this.settings[key];
  }

  has(key: string): boolean {
    return key in this.settings;
  }

  /** New settings value with the given key set. */
  with(key: string, value: WorkspaceSettingValue): WorkspaceSettings {
    return WorkspaceSettings.create({ ...this.settings, [key]: value });
  }

  /** New settings value with the given key removed. */
  without(key: string): WorkspaceSettings {
    const rest = Object.fromEntries(
      Object.entries(this.settings).filter(([existing]) => existing !== key),
    );
    return new WorkspaceSettings(Object.freeze(rest));
  }

  toRecord(): Readonly<Record<string, WorkspaceSettingValue>> {
    return this.settings;
  }

  equals(other: unknown): boolean {
    return other instanceof WorkspaceSettings && this.deepEquals(other.settings, this.settings);
  }

  toString(): string {
    return JSON.stringify(this.settings);
  }
}
