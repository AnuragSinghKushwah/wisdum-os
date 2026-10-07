# Domain: Plugin

> Implemented in [`packages/domain/src/plugin/`](../../packages/domain/src/plugin/), following the tactical patterns of [ADR 0007](../adr/0007-domain-driven-design.md). The runtime that loads and sandboxes plugins is separate; see [ADR 0013](../adr/0013-plugin-system-sdk-runtime-and-sandbox.md).

## Purpose

Records which plugins a tenant has installed and whether each one is allowed to serve capability requests. The context owns the installation lifecycle and the plugin's declared manifest. Loading code, sandboxing it, and resolving capabilities at runtime are not part of this context.

## Entities

**Plugin** (aggregate root) — one installation of one plugin in one tenant, identified by `PluginId`.

| State | Modelled as |
| --- | --- |
| Manifest | `PluginManifest`, an immutable self-description replaced wholesale on update |
| Lifecycle | `PluginStatus` |
| Timestamps | `installedAt`, `updatedAt` from the `Clock` |

The manifest contains:

- `PluginName`, globally unique, in `publisher/plugin` kebab-case form such as `wisdum/github`.
- `PluginVersion`, a semantic version (`major.minor.patch`, optional prerelease; no build metadata).
- A display name and description.
- `PluginCapability` values: dot-namespaced kebab-case contracts such as `publishing.website` or `ai.llm-provider`.
- `PluginPermission` values: `resource:action` strings such as `document:read`, declared up front for consent.
- `PluginDependency` values: a plugin name plus a version range in one of three forms, `x.y.z`, `^x.y.z`, or `>=x.y.z`.

### Lifecycle

```
installed ──▶ enabled ◀──▶ disabled
    │            │            │
    └────────────┴────────────┴──▶ uninstalled (terminal)
```

### Behaviors

`Plugin.install()`, `update(manifest)`, `enable()`, `disable()`, `uninstall()`, plus the queries `isEnabled()` and `providesCapability(capability)`.

### Invariants

- An uninstalled plugin cannot be modified.
- An update cannot change the plugin's name and must carry a strictly newer version.
- A manifest cannot depend on itself or list the same dependency twice.
- Status changes follow the map above.
- Each value object validates itself (name, semver, capability and permission formats, dependency range grammar).
- Uniqueness of a plugin name within a tenant is checked by the install use case through `findByName`.

## Events

### Published

| Event | Raised by |
| --- | --- |
| `plugin.plugin.installed` | `Plugin.install()` |
| `plugin.plugin.updated` | `update()` (payload has the from and to versions) |
| `plugin.plugin.enabled` | `enable()` |
| `plugin.plugin.disabled` | `disable()` |
| `plugin.plugin.uninstalled` | `uninstall()` |

### Consumed

None; domain events are published only, and the SSE endpoint is the only subscriber.

## Use cases

Commands `installPluginCommand`, `enablePluginCommand`, `disablePluginCommand`; queries `getPluginQuery`, `listPluginsQuery`; the `PluginReadModel` port. All in [`packages/application/src/plugin/`](../../packages/application/src/plugin/).

`InstallPluginHandler` rejects a second installation of the same name with a `ConflictError`. `CapabilityPluginProvisioner` is a service other contexts use: given a default capability manifest, it returns whether the capability is enabled for the tenant, and if the tenant has no plugin for it yet, it installs and enables a built-in one on the spot (this is how the publishing providers become available without manual installation).

## Specifications

`PluginIsEnabled`, `PluginProvidesCapability` (takes a capability), `PluginDependsOn` (takes a plugin name), `PluginRequestsNoPermissions`.

## API surface

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/v1/plugins/manifest/validate` | Validate a plugin manifest (SDK shape) without installing it. |
| `GET` | `/v1/plugins` | List installed plugins. |
| `POST` | `/v1/plugins` | Install a plugin. |
| `GET` | `/v1/plugins/:id` | Fetch one plugin. |
| `POST` | `/v1/plugins/:id/enable` | Enable it. |
| `POST` | `/v1/plugins/:id/disable` | Disable it. |

Details: [docs/api/plugins.md](../api/plugins.md). Routes are in `apps/api/src/routes/plugin-routes.ts`.

## Persistence

`PluginRepository` (`findById`, `findByName`, `findByCapability`, `findAll`, `save`, `delete`) has PostgreSQL and in-memory implementations. Table: `plugins` (migration `0007_create_plugins`), unique on name per tenant.

## Dependencies

`@wisdum/types`, `@wisdum/errors`, and the shared primitives in `packages/domain/src/shared`.

## Open questions

- **Two manifest formats.** The domain's capability and permission formats (`publishing.website`, `document:read`) do not match the SDK manifest that `POST /v1/plugins/manifest/validate` accepts (`input_connector`, `read_content`). An SDK manifest would be rejected by `PluginCapability.create` and `PluginPermission.create`, so the validated shape and the installable shape cannot yet be the same document.
- `update()` and `uninstall()` have no use case or route, so a plugin can be installed, enabled, and disabled through the API but not upgraded or removed.
- The `dependencies` of an installed plugin are always empty from the install use case, so dependency checks (`PluginDependsOn`) have no data to act on.
