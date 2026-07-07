/**
 * @wisdum/infrastructure — adapters implementing the ports declared by the
 * domain and application layers: persistence, event publishing, clock,
 * id/slug generation, storage, cache, search, and configuration.
 *
 * No business logic.
 */
export * from './persistence/index.js';
export * from './read-models/index.js';
export * from './ids/index.js';
export * from './slugs/index.js';
export * from './events/index.js';
export * from './clock/index.js';
export * from './hashing/index.js';
export * from './storage/index.js';
export * from './cache/index.js';
export * from './search/index.js';
export * from './config/index.js';
