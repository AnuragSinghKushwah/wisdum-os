import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identity of a Document aggregate. Validates shape only — identifier
 * generation happens outside the domain.
 */
export class DocumentId extends Identifier<'DocumentId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): DocumentId {
    if (!UUID_PATTERN.test(value)) {
      throw new ValidationError('DocumentId must be a valid UUID', { value });
    }
    return new DocumentId(value as UUID);
  }
}
