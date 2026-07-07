import { describe, expect, it } from 'vitest';
import { PluginDependency } from './plugin-dependency.js';
import { PluginVersion } from './plugin-version.js';

describe('PluginDependency', () => {
  it('exact range is satisfied only by that exact version', () => {
    const dependency = PluginDependency.create({ pluginName: 'wisdum/upstream', range: '1.2.3' });
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.2.3'))).toBe(true);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.2.4'))).toBe(false);
  });

  it('caret range allows any version with the same major that is not older', () => {
    const dependency = PluginDependency.create({ pluginName: 'wisdum/upstream', range: '^1.2.0' });
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.2.0'))).toBe(true);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.9.0'))).toBe(true);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('2.0.0'))).toBe(false);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.1.0'))).toBe(false);
  });

  it('>= range allows any version at or above the minimum, across majors', () => {
    const dependency = PluginDependency.create({ pluginName: 'wisdum/upstream', range: '>=1.2.0' });
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.2.0'))).toBe(true);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('3.0.0'))).toBe(true);
    expect(dependency.isSatisfiedByVersion(PluginVersion.create('1.1.9'))).toBe(false);
  });

  it('rejects a malformed range', () => {
    expect(() =>
      PluginDependency.create({ pluginName: 'wisdum/upstream', range: 'latest' }),
    ).toThrow();
  });
});
