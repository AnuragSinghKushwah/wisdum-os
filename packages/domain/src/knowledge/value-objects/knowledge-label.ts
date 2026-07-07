import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_LABEL_LENGTH = 100;

/**
 * A normalized (trimmed, lowercased) label attached to a knowledge asset.
 * Normalization makes label equality case-insensitive by construction.
 */
export class KnowledgeLabel extends ValueObject<KnowledgeLabel> {
  private constructor(private readonly label: string) {
    super();
  }

  static create(value: string): KnowledgeLabel {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Knowledge label cannot be empty');
    }
    if (normalized.length > MAX_LABEL_LENGTH) {
      throw new ValidationError(`Knowledge label cannot exceed ${MAX_LABEL_LENGTH} characters`, {
        length: normalized.length,
      });
    }
    return new KnowledgeLabel(normalized);
  }

  get value(): string {
    return this.label;
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeLabel && other.label === this.label;
  }

  toString(): string {
    return this.label;
  }
}
