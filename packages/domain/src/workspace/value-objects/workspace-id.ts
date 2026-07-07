import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identity of a Workspace aggregate. Validates shape only — identifier
 * generation happens outside the domain.
 */
export class WorkspaceId extends Identifier<'WorkspaceId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): WorkspaceId {
    if (!UUID_PATTERN.test(value)) {
      throw new ValidationError('WorkspaceId must be a valid UUID', { value });
    }
    return new WorkspaceId(value as UUID);
  }
}
