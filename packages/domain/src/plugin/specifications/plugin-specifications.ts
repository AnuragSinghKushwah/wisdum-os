import { ComposableSpecification } from '../../shared/index.js';
import type { Plugin } from '../entities/plugin.js';
import type { PluginCapability } from '../value-objects/plugin-capability.js';
import type { PluginName } from '../value-objects/plugin-name.js';

/** Satisfied when the plugin is enabled and may serve capability requests. */
export class PluginIsEnabled extends ComposableSpecification<Plugin> {
  override isSatisfiedBy(candidate: Plugin): boolean {
    return candidate.isEnabled();
  }
}

/** Satisfied when the plugin declares the given capability in its manifest. */
export class PluginProvidesCapability extends ComposableSpecification<Plugin> {
  constructor(private readonly capability: PluginCapability) {
    super();
  }

  override isSatisfiedBy(candidate: Plugin): boolean {
    return candidate.providesCapability(this.capability);
  }
}

/** Satisfied when the plugin declares a dependency on the given plugin. */
export class PluginDependsOn extends ComposableSpecification<Plugin> {
  constructor(private readonly dependencyName: PluginName) {
    super();
  }

  override isSatisfiedBy(candidate: Plugin): boolean {
    return candidate.manifest.dependencies.some((dependency) =>
      dependency.pluginName.equals(this.dependencyName),
    );
  }
}

/** Satisfied when the plugin requests no permissions (safe-by-default installs). */
export class PluginRequestsNoPermissions extends ComposableSpecification<Plugin> {
  override isSatisfiedBy(candidate: Plugin): boolean {
    return candidate.manifest.permissions.length === 0;
  }
}
