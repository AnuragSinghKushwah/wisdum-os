import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(kind: string, value: string): asserts value is UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${kind} must be a valid UUID`, { value });
  }
}

/** Identity of an AgentTask aggregate. */
export class AgentTaskId extends Identifier<'AgentTaskId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): AgentTaskId {
    assertUuid('AgentTaskId', value);
    return new AgentTaskId(value as UUID);
  }
}
