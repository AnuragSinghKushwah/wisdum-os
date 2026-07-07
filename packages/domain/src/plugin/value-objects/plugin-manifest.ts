import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import type { PluginCapability } from './plugin-capability.js';
import type { PluginDependency } from './plugin-dependency.js';
import type { PluginName } from './plugin-name.js';
import type { PluginPermission } from './plugin-permission.js';
import type { PluginVersion } from './plugin-version.js';

const MAX_DISPLAY_NAME = 120;
const MAX_DESCRIPTION = 2000;

export interface PluginManifestProps {
  readonly name: PluginName;
  readonly version: PluginVersion;
  readonly displayName: string;
  readonly description: string;
  readonly capabilities: readonly PluginCapability[];
  readonly permissions: readonly PluginPermission[];
  readonly dependencies: readonly PluginDependency[];
}

/**
 * The complete, immutable self-description a plugin ships with: what it is,
 * what it provides (capabilities), what it needs (permissions, dependencies).
 * An update replaces the manifest wholesale — manifests are never edited
 * in place, so an installation's audit trail is a sequence of manifests.
 */
export class PluginManifest extends ValueObject<PluginManifest> {
  private constructor(private readonly props: Readonly<PluginManifestProps>) {
    super();
  }

  static create(props: PluginManifestProps): PluginManifest {
    const displayName = props.displayName.trim();
    if (displayName.length === 0 || displayName.length > MAX_DISPLAY_NAME) {
      throw new ValidationError('Plugin display name is missing or too long', {
        length: displayName.length,
      });
    }
    if (props.description.length > MAX_DESCRIPTION) {
      throw new ValidationError(`Plugin description cannot exceed ${MAX_DESCRIPTION} characters`, {
        length: props.description.length,
      });
    }
    const seenDependencies = new Set<string>();
    for (const dependency of props.dependencies) {
      if (dependency.pluginName.equals(props.name)) {
        throw new ValidationError('A plugin cannot depend on itself', {
          plugin: props.name.value,
        });
      }
      if (seenDependencies.has(dependency.pluginName.value)) {
        throw new ValidationError('Duplicate plugin dependency', {
          dependency: dependency.pluginName.value,
        });
      }
      seenDependencies.add(dependency.pluginName.value);
    }
    return new PluginManifest(
      Object.freeze({
        name: props.name,
        version: props.version,
        displayName,
        description: props.description,
        capabilities: Object.freeze([...props.capabilities]),
        permissions: Object.freeze([...props.permissions]),
        dependencies: Object.freeze([...props.dependencies]),
      }),
    );
  }

  get name(): PluginName {
    return this.props.name;
  }

  get version(): PluginVersion {
    return this.props.version;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get description(): string {
    return this.props.description;
  }

  get capabilities(): readonly PluginCapability[] {
    return this.props.capabilities;
  }

  get permissions(): readonly PluginPermission[] {
    return this.props.permissions;
  }

  get dependencies(): readonly PluginDependency[] {
    return this.props.dependencies;
  }

  declaresCapability(capability: PluginCapability): boolean {
    return this.props.capabilities.some((declared) => declared.equals(capability));
  }

  requestsPermission(permission: PluginPermission): boolean {
    return this.props.permissions.some((requested) => requested.equals(permission));
  }

  equals(other: unknown): boolean {
    return (
      other instanceof PluginManifest &&
      other.props.name.equals(this.props.name) &&
      other.props.version.equals(this.props.version) &&
      other.props.displayName === this.props.displayName &&
      other.props.description === this.props.description &&
      this.sameList(other.props.capabilities, this.props.capabilities) &&
      this.sameList(other.props.permissions, this.props.permissions) &&
      this.sameList(other.props.dependencies, this.props.dependencies)
    );
  }

  private sameList(
    a: readonly { equals(other: unknown): boolean }[],
    b: readonly { equals(other: unknown): boolean }[],
  ): boolean {
    return a.length === b.length && a.every((item, index) => item.equals(b[index]));
  }

  toString(): string {
    return `${this.props.name.value}@${this.props.version.toString()}`;
  }
}
