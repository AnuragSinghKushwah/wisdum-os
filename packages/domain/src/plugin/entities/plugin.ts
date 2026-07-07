import type { IsoTimestamp, TenantId } from '@wisdum/types';
import { InvariantViolationError } from '@wisdum/errors';
import { AggregateRoot } from '../../shared/index.js';
import type { Clock } from '../../shared/index.js';
import { PluginStatus } from '../value-objects/plugin-status.js';
import type { PluginCapability } from '../value-objects/plugin-capability.js';
import type { PluginId } from '../value-objects/plugin-id.js';
import type { PluginManifest } from '../value-objects/plugin-manifest.js';
import {
  PLUGIN_DISABLED,
  PLUGIN_ENABLED,
  PLUGIN_EVENT_SCHEMA_VERSION,
  PLUGIN_INSTALLED,
  PLUGIN_UNINSTALLED,
  PLUGIN_UPDATED,
} from '../events/plugin-events.js';
import type { AnyPluginEvent } from '../events/plugin-events.js';

/** What callers provide to install a plugin. */
export interface InstallPluginProps {
  readonly id: PluginId;
  readonly tenantId: TenantId;
  readonly manifest: PluginManifest;
}

/** Full state needed to rehydrate an existing plugin (no events are raised). */
export interface PluginSnapshot {
  readonly id: PluginId;
  readonly tenantId: TenantId;
  readonly manifest: PluginManifest;
  readonly status: PluginStatus;
  readonly installedAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/**
 * Aggregate root of the Plugin bounded context: one plugin installation in
 * one tenant. The aggregate owns the manifest (identity, capabilities,
 * requested permissions, dependencies) and the installation lifecycle.
 * Loading, sandboxing, and capability dispatch are runtime concerns and
 * live outside the domain.
 */
export class Plugin extends AggregateRoot<PluginId> {
  private readonly _tenantId: TenantId;
  private _manifest: PluginManifest;
  private _status: PluginStatus;
  private readonly _installedAt: IsoTimestamp;
  private _updatedAt: IsoTimestamp;

  private constructor(snapshot: PluginSnapshot) {
    super(snapshot.id);
    this._tenantId = snapshot.tenantId;
    this._manifest = snapshot.manifest;
    this._status = snapshot.status;
    this._installedAt = snapshot.installedAt;
    this._updatedAt = snapshot.updatedAt;
  }

  /** Install a plugin (disabled until explicitly enabled) and raise PluginInstalled. */
  static install(props: InstallPluginProps, clock: Clock): Plugin {
    const now = clock.now();
    const plugin = new Plugin({
      id: props.id,
      tenantId: props.tenantId,
      manifest: props.manifest,
      status: PluginStatus.installed(),
      installedAt: now,
      updatedAt: now,
    });
    plugin.raise({
      ...plugin.eventEnvelope(now),
      eventType: PLUGIN_INSTALLED,
      payload: {
        pluginId: props.id.value(),
        name: props.manifest.name.value,
        version: props.manifest.version.toString(),
        capabilities: props.manifest.capabilities.map((capability) => capability.value),
        permissions: props.manifest.permissions.map((permission) => permission.value),
      },
    });
    return plugin;
  }

  /** Rehydrate an existing plugin from persisted state. Raises no events. */
  static reconstitute(snapshot: PluginSnapshot): Plugin {
    return new Plugin(snapshot);
  }

  // ── Behavior ───────────────────────────────────────────────────────────

  /** Replace the manifest with a newer version of the same plugin. */
  update(manifest: PluginManifest, clock: Clock): void {
    this.ensureNotUninstalled();
    if (!manifest.name.equals(this._manifest.name)) {
      throw new InvariantViolationError('An update cannot change the plugin identity', {
        pluginId: this.id.value(),
        from: this._manifest.name.value,
        to: manifest.name.value,
      });
    }
    if (!manifest.version.isNewerThan(this._manifest.version)) {
      throw new InvariantViolationError('An update must carry a newer version', {
        pluginId: this.id.value(),
        from: this._manifest.version.toString(),
        to: manifest.version.toString(),
      });
    }
    const now = clock.now();
    const fromVersion = this._manifest.version;
    this._manifest = manifest;
    this.touch(now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PLUGIN_UPDATED,
      payload: {
        pluginId: this.id.value(),
        name: manifest.name.value,
        fromVersion: fromVersion.toString(),
        toVersion: manifest.version.toString(),
      },
    });
  }

  enable(clock: Clock): void {
    if (this._status.is('enabled')) return;
    const now = clock.now();
    this.transitionTo(PluginStatus.enabled(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PLUGIN_ENABLED,
      payload: { pluginId: this.id.value(), name: this._manifest.name.value },
    });
  }

  disable(clock: Clock): void {
    if (this._status.is('disabled')) return;
    const now = clock.now();
    this.transitionTo(PluginStatus.disabled(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PLUGIN_DISABLED,
      payload: { pluginId: this.id.value(), name: this._manifest.name.value },
    });
  }

  uninstall(clock: Clock): void {
    if (this._status.is('uninstalled')) return;
    const now = clock.now();
    this.transitionTo(PluginStatus.uninstalled(), now);
    this.raise({
      ...this.eventEnvelope(now),
      eventType: PLUGIN_UNINSTALLED,
      payload: { pluginId: this.id.value(), name: this._manifest.name.value },
    });
  }

  // ── State access ───────────────────────────────────────────────────────

  get tenantId(): TenantId {
    return this._tenantId;
  }

  get manifest(): PluginManifest {
    return this._manifest;
  }

  get status(): PluginStatus {
    return this._status;
  }

  get installedAt(): IsoTimestamp {
    return this._installedAt;
  }

  get updatedAt(): IsoTimestamp {
    return this._updatedAt;
  }

  isEnabled(): boolean {
    return this._status.is('enabled');
  }

  providesCapability(capability: PluginCapability): boolean {
    return this._manifest.declaresCapability(capability);
  }

  // ── Invariant enforcement ──────────────────────────────────────────────

  private ensureNotUninstalled(): void {
    if (this._status.is('uninstalled')) {
      throw new InvariantViolationError('An uninstalled plugin cannot be modified', {
        pluginId: this.id.value(),
      });
    }
  }

  private transitionTo(next: PluginStatus, now: IsoTimestamp): void {
    if (!this._status.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Plugin cannot transition from '${this._status.value}' to '${next.value}'`,
        { pluginId: this.id.value(), from: this._status.value, to: next.value },
      );
    }
    this._status = next;
    this.touch(now);
  }

  private touch(now: IsoTimestamp): void {
    this._updatedAt = now;
  }

  private raise(event: AnyPluginEvent): void {
    this.addDomainEvent(event);
  }

  private eventEnvelope(occurredAt: IsoTimestamp): {
    aggregateId: PluginId;
    tenantId: TenantId;
    occurredAt: IsoTimestamp;
    version: number;
  } {
    return {
      aggregateId: this.id,
      tenantId: this._tenantId,
      occurredAt,
      version: PLUGIN_EVENT_SCHEMA_VERSION,
    };
  }
}
