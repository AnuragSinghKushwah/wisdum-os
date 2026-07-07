import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(kind: string, value: string): UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${kind} must be a valid UUID`, { value });
  }
  return value as UUID;
}

/** Identity of an AIProvider aggregate. */
export class AIProviderId extends Identifier<'AIProviderId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): AIProviderId {
    return new AIProviderId(assertUuid('AIProviderId', value));
  }
}

/** Identity of an AIModel aggregate. */
export class AIModelId extends Identifier<'AIModelId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): AIModelId {
    return new AIModelId(assertUuid('AIModelId', value));
  }
}

/** Identity of a PromptTemplate aggregate. */
export class PromptTemplateId extends Identifier<'PromptTemplateId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): PromptTemplateId {
    return new PromptTemplateId(assertUuid('PromptTemplateId', value));
  }
}

/** Identity of a Conversation aggregate. */
export class ConversationId extends Identifier<'ConversationId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ConversationId {
    return new ConversationId(assertUuid('ConversationId', value));
  }
}
