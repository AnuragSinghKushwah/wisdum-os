import { describe, expect, it } from 'vitest';
import { PluginManifestValidator } from '../plugin-manifest-validator.js';

describe('PluginManifestValidator', () => {
  const validator = new PluginManifestValidator();

  it('approves valid plugin manifest', () => {
    const result = validator.validate({
      name: 'github-sync',
      displayName: 'GitHub Sync Connector',
      version: '1.0.0',
      description: 'Syncs GitHub repository issues and code changes into Wisdum OS.',
      capabilities: ['input_connector'],
      permissions: ['read_content', 'network_access'],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects invalid plugin names', () => {
    const result = validator.validate({
      name: 'GitHub Sync!',
      displayName: 'GitHub Sync',
      version: '1.0.0',
      description: 'Description text',
      capabilities: ['input_connector'],
      permissions: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('invalid. Must be lowercase alphanumeric hyphens');
  });

  it('rejects invalid semver string', () => {
    const result = validator.validate({
      name: 'github-sync',
      displayName: 'GitHub Sync',
      version: 'v1.0-latest',
      description: 'Description text',
      capabilities: ['input_connector'],
      permissions: [],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be valid SemVer');
  });

  it('rejects invalid permissions', () => {
    const result = validator.validate({
      name: 'github-sync',
      displayName: 'GitHub Sync',
      version: '1.0.0',
      description: 'Description text',
      capabilities: ['input_connector'],
      permissions: ['admin_root_access' as any],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Invalid permission "admin_root_access"');
  });
});
