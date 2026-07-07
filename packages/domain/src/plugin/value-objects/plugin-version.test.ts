import { describe, expect, it } from 'vitest';
import { PluginVersion } from './plugin-version.js';

describe('PluginVersion', () => {
  it('parses major.minor.patch', () => {
    const version = PluginVersion.create('1.2.3');
    expect(version.major).toBe(1);
    expect(version.minor).toBe(2);
    expect(version.patch).toBe(3);
    expect(version.isPrerelease()).toBe(false);
  });

  it('parses an optional prerelease segment', () => {
    const version = PluginVersion.create('1.2.3-beta.1');
    expect(version.prerelease).toBe('beta.1');
    expect(version.isPrerelease()).toBe(true);
  });

  it('rejects a malformed version string', () => {
    expect(() => PluginVersion.create('1.2')).toThrow();
    expect(() => PluginVersion.create('not-a-version')).toThrow();
  });

  it('orders by major, then minor, then patch', () => {
    expect(PluginVersion.create('2.0.0').isNewerThan(PluginVersion.create('1.9.9'))).toBe(true);
    expect(PluginVersion.create('1.3.0').isNewerThan(PluginVersion.create('1.2.9'))).toBe(true);
    expect(PluginVersion.create('1.2.4').isNewerThan(PluginVersion.create('1.2.3'))).toBe(true);
  });

  it('a prerelease sorts before its release', () => {
    expect(PluginVersion.create('1.0.0').isNewerThan(PluginVersion.create('1.0.0-beta'))).toBe(
      true,
    );
  });

  it('equals() compares by version value, not by reference', () => {
    expect(PluginVersion.create('1.0.0').equals(PluginVersion.create('1.0.0'))).toBe(true);
  });
});
