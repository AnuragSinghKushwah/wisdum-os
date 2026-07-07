// Core DDD patterns
export * from './identifier.js';
export * from './entity.js';
export * from './value-object.js';
export * from './aggregate-root.js';
export * from './domain-event.js';
export * from './repository.js';
export * from './domain-service.js';
export * from './specification.js';
export * from './clock.js';

// Boundary descriptor for bounded context metadata
export interface DomainDescriptor {
  readonly name: string;
  readonly description: string;
}
