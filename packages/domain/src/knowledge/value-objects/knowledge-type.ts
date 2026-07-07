import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { KNOWLEDGE_TYPES } from '../types/knowledge-types.js';
import type { KnowledgeTypeValue } from '../types/knowledge-types.js';

/** The kind of asset a knowledge record describes. Fixed at creation. */
export class KnowledgeType extends ValueObject<KnowledgeType> {
  private constructor(private readonly type: KnowledgeTypeValue) {
    super();
  }

  static create(value: string): KnowledgeType {
    if (!(KNOWLEDGE_TYPES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown knowledge type: ${value}`, {
        value,
        allowed: [...KNOWLEDGE_TYPES],
      });
    }
    return new KnowledgeType(value as KnowledgeTypeValue);
  }

  get value(): KnowledgeTypeValue {
    return this.type;
  }

  is(value: KnowledgeTypeValue): boolean {
    return this.type === value;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeType && other.type === this.type;
  }

  toString(): string {
    return this.type;
  }
}
