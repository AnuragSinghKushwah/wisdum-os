/**
 * @wisdum/kernel — the platform kernel.
 *
 * Owns dependency injection, module registration, startup/shutdown,
 * health, and the plugin lifecycle contract. No application logic.
 */
export * from './di/index.js';
export * from './registry/index.js';
export * from './modules/index.js';
export * from './lifecycle/index.js';
export * from './health/index.js';
export * from './config/index.js';
export * from './feature-flags/index.js';
export * from './events/index.js';
export * from './plugins/index.js';
export * from './interfaces/index.js';
