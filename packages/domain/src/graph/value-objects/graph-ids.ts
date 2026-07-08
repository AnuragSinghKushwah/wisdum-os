import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(kind: string, value: string): asserts value is UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${kind} must be a valid UUID`, { value });
  }
}

/** Identity of a Concept aggregate. */
export class ConceptId extends Identifier<'ConceptId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ConceptId {
    assertUuid('ConceptId', value);
    return new ConceptId(value as UUID);
  }
}

/** Identity of a ConceptMention aggregate (a Knowledge -> Concept edge). */
export class ConceptMentionId extends Identifier<'ConceptMentionId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ConceptMentionId {
    assertUuid('ConceptMentionId', value);
    return new ConceptMentionId(value as UUID);
  }
}

/** Identity of a ConceptRelationship aggregate (a Concept <-> Concept edge). */
export class ConceptRelationshipId extends Identifier<'ConceptRelationshipId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ConceptRelationshipId {
    assertUuid('ConceptRelationshipId', value);
    return new ConceptRelationshipId(value as UUID);
  }
}
