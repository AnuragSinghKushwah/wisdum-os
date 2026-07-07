import { ConfigurationError } from '@wisdum/errors';
import type { PluginManifest } from '@wisdum/domain';

/**
 * Orders plugin manifests so every dependency activates before its
 * dependents, and verifies each declared dependency is both present and
 * version-compatible (`PluginDependency.isSatisfiedByVersion`). Mirrors
 * the kernel's module dependency ordering — same shape of problem, one
 * level up in the stack.
 */
export class DependencyResolver {
  resolveActivationOrder(manifests: readonly PluginManifest[]): readonly PluginManifest[] {
    const byName = new Map(manifests.map((manifest) => [manifest.name.value, manifest]));
    const ordered: PluginManifest[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (manifest: PluginManifest, chain: readonly string[]): void => {
      const name = manifest.name.value;
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new ConfigurationError('Circular plugin dependency detected', {
          chain: [...chain, name],
        });
      }
      visiting.add(name);
      for (const dependency of manifest.dependencies) {
        const dependencyName = dependency.pluginName.value;
        const dependencyManifest = byName.get(dependencyName);
        if (dependencyManifest === undefined) {
          throw new ConfigurationError(
            `Plugin '${name}' depends on unavailable plugin '${dependencyName}'`,
            { plugin: name, dependency: dependencyName },
          );
        }
        if (!dependency.isSatisfiedByVersion(dependencyManifest.version)) {
          throw new ConfigurationError(
            `Plugin '${name}' requires '${dependencyName}@${dependency.range}', found '${dependencyManifest.version.toString()}'`,
            {
              plugin: name,
              dependency: dependencyName,
              range: dependency.range,
              found: dependencyManifest.version.toString(),
            },
          );
        }
        visit(dependencyManifest, [...chain, name]);
      }
      visiting.delete(name);
      visited.add(name);
      ordered.push(manifest);
    };

    for (const manifest of manifests) {
      visit(manifest, []);
    }
    return ordered;
  }
}
