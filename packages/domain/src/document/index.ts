import type { DomainDescriptor } from '../shared/index.js';

/** Document bounded context — raw content records behind knowledge assets. */
export const documentDomain: DomainDescriptor = {
  name: 'document',
  description: 'Document content, its encoding, integrity, and revision lifecycle.',
};

export * from './types/document-types.js';
export * from './value-objects/document-id.js';
export * from './value-objects/document-content.js';
export * from './value-objects/mime-type.js';
export * from './value-objects/language-code.js';
export * from './value-objects/content-encoding.js';
export * from './value-objects/byte-size.js';
export * from './value-objects/content-hash.js';
export * from './value-objects/document-status.js';
export * from './events/document-events.js';
export * from './entities/document.js';
export * from './repositories/document-repository.js';
export * from './specifications/document-specifications.js';
