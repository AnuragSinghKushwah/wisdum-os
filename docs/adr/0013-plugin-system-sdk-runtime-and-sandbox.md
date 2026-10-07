# 0013 — Plugin system: SDK, runtime, and sandbox

- **Status:** Accepted (partially implemented; gaps listed under Consequences)
- **Date:** 2026-07-27
- **Deciders:** Founding maintainer
- **Recorded:** 2026-10-07, retroactively. The sandbox interface and kernel plugin lifecycle landed in `dad8b3d`; the SDK and manifest validation in `8a89aa0`. Rationale is reconstructed from the code and history.

## Context

The project principle is that external services are plugins and the core stays vendor-independent. [ADR 0004](0004-typescript-workspace-topology.md) created two plugin locations: `platform/plugins` (the runtime) and the top-level `plugins/` directory (implementations). Developers need a stable contract for writing plugins, and the platform needs a way to validate and run them.

## Decision

- **A public SDK, `@wisdum/plugin-sdk`,** defines the manifest and `defineWisdumPlugin()`. A manifest declares `name`, `displayName`, `version`, `description`, `author`, optional `homepage`, `minWisdumVersion`, and `entrypoint`, plus:
  - **capabilities:** `input_connector`, `publishing_provider`, `transformation_pipeline`, `custom_agent`;
  - **permissions:** `read_content`, `publish_content`, `network_access`, `storage_access`, `ai_inference`.
  A plugin may implement `onInit`, `onEnable`, `onDisable`, and `onUninstall`.
- **The runtime lives in `platform/plugins`:** discovery, registry, dependency and capability handling, lifecycle, and `PluginManifestValidator`, which checks a manifest for required fields, a semver `version`, at least one capability (unrecognized capability names produce warnings), and a `permissions` array, and is exposed as `POST /v1/plugins/manifest/validate`.
- **The kernel defines the load contract.** `PluginEntryPoint` has `name`, `register(container)`, and optional `activate` and `deactivate`. `PluginLoader` runs those callbacks through a `Sandbox`, and `CapabilityRegistry<T>` collects capability implementations.
- **The domain models installation.** The `Plugin` aggregate (name in `publisher/plugin` form, version, capabilities, permissions, dependencies, status) records which plugins a tenant has installed.
- **The only sandbox is `PassthroughSandbox`,** which runs plugin code directly in the host process. Its documentation limits it to trusted, first-party plugins until real isolation (worker threads or a VM context) is added behind the same `Sandbox` interface.

## Consequences

- Plugin authors and the platform share a typed contract, and manifests can be validated without loading code.
- **No isolation, and permissions are not enforced.** The permission list is declarative metadata. A plugin loaded today runs with the full privileges of the API process, so untrusted third-party plugins must not be loaded.
- **The SDK and the kernel describe different shapes.** The SDK's lifecycle (`onInit`…) and the kernel's `PluginEntryPoint` (`register`, `activate`, `deactivate`) are separate, and no adapter connects them: nothing consumes the output of `defineWisdumPlugin` at runtime.
- **The scaffolding command is out of step with both.** `wisdum plugin create` generates a manifest with `entryPoint` (the SDK says `entrypoint`), no `author`, and a `setup` hook that exists in neither contract, so generated plugins do not conform to the SDK.
- **Providers are not plugins yet.** The top-level `plugins/` directory is empty. First-party providers (Anthropic, OpenAI, publishing targets, input connectors) live in `platform/*` and are wired in the composition root, which contradicts the capability descriptions in `platform/*/src/index.ts` that say providers integrate as plugins.
- Reconciling the SDK contract with `PluginEntryPoint`, adding a real sandbox, and enforcing permissions each need a follow-up decision before third-party plugins are supported.

## Alternatives considered

- **Out-of-process plugins (separate processes or containers).** The strongest isolation; not taken yet because it is far heavier to build. The `Sandbox` interface keeps it possible.
- **Compiling every integration into the platform.** What happens in practice today for first-party providers; it gives up the extensibility the project promises.
