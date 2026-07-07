import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identity of a SearchIndex aggregate. Validates shape only — identifier
 * generation happens outside the domain.
 */
export class SearchIndexId extends Identifier<'SearchIndexId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): SearchIndexId {
    if (!UUID_PATTERN.test(value)) {
      throw new ValidationError('SearchIndexId must be a valid UUID', { value });
    }
    return new SearchIndexId(value as UUID);
  }
}
