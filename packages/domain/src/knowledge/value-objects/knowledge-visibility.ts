import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { KNOWLEDGE_VISIBILITIES } from '../types/knowledge-types.js';
import type { KnowledgeVisibilityValue } from '../types/knowledge-types.js';

/** Who can see a knowledge asset: its owner, the workspace, or everyone. */
export class KnowledgeVisibility extends ValueObject<KnowledgeVisibility> {
  private constructor(private readonly visibility: KnowledgeVisibilityValue) {
    super();
  }

  static create(value: string): KnowledgeVisibility {
    if (!(KNOWLEDGE_VISIBILITIES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown knowledge visibility: ${value}`, {
        value,
        allowed: [...KNOWLEDGE_VISIBILITIES],
      });
    }
    return new KnowledgeVisibility(value as KnowledgeVisibilityValue);
  }

  get value(): KnowledgeVisibilityValue {
    return this.visibility;
  }

  is(value: KnowledgeVisibilityValue): boolean {
    return this.visibility === value;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeVisibility && other.visibility === this.visibility;
  }

  toString(): string {
    return this.visibility;
  }
}
