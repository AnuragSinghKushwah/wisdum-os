/**
 * Composition root for the Wisdum API application.
 * Wires shared infrastructure and every bounded context's handlers behind
 * HTTP routes — business logic lives in packages/domain and
 * packages/application, never here.
 */
export { buildServer } from './server.js';
