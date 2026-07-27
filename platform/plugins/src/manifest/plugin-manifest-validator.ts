import type { WisdumPluginManifest, PluginPermission, WisdumCapability } from '@wisdum/plugin-sdk';

export interface ManifestValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

const VALID_PERMISSIONS: readonly PluginPermission[] = [
  'read_content',
  'publish_content',
  'network_access',
  'storage_access',
  'ai_inference',
];

const VALID_CAPABILITIES: readonly WisdumCapability[] = [
  'input_connector',
  'publishing_provider',
  'transformation_pipeline',
  'custom_agent',
];

const PLUGIN_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/;

export class PluginManifestValidator {
  validate(manifest: Partial<WisdumPluginManifest>): ManifestValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Name validation
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Plugin manifest must specify a valid "name" string.');
    } else if (!PLUGIN_NAME_REGEX.test(manifest.name)) {
      errors.push(
        `Plugin name "${manifest.name}" is invalid. Must be lowercase alphanumeric hyphens (e.g. "my-plugin").`,
      );
    }

    // Display Name validation
    if (!manifest.displayName || typeof manifest.displayName !== 'string' || manifest.displayName.trim() === '') {
      errors.push('Plugin manifest must specify a non-empty "displayName".');
    }

    // Version validation
    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Plugin manifest must specify a "version" string.');
    } else if (!SEMVER_REGEX.test(manifest.version)) {
      errors.push(`Plugin version "${manifest.version}" must be valid SemVer (e.g. "1.0.0").`);
    }

    // Description validation
    if (!manifest.description || typeof manifest.description !== 'string' || manifest.description.trim() === '') {
      errors.push('Plugin manifest must specify a non-empty "description".');
    }

    // Capabilities validation
    if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
      errors.push('Plugin manifest must declare at least one capability in "capabilities".');
    } else {
      for (const cap of manifest.capabilities) {
        if (!VALID_CAPABILITIES.includes(cap as WisdumCapability) && typeof cap === 'string') {
          warnings.push(`Unknown capability "${cap}". Standard capabilities: ${VALID_CAPABILITIES.join(', ')}.`);
        }
      }
    }

    // Permissions validation
    if (!Array.isArray(manifest.permissions)) {
      errors.push('Plugin manifest must specify a "permissions" array (can be empty if none required).');
    } else {
      for (const perm of manifest.permissions) {
        if (!VALID_PERMISSIONS.includes(perm as PluginPermission)) {
          errors.push(`Invalid permission "${perm}". Recognized permissions: ${VALID_PERMISSIONS.join(', ')}.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
