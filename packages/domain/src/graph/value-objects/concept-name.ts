import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_NAME_LENGTH = 200;

/**
 * A concept's display name. Dedup happens on `normalized` (lowercased,
 * whitespace-collapsed) so "Redis Scaling" and "redis scaling" merge into
 * one graph node instead of two.
 */
export class ConceptName extends ValueObject<ConceptName> {
  private constructor(
    private readonly name: string,
    private readonly normalizedName: string,
  ) {
    super();
  }

  static create(value: string): ConceptName {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (trimmed.length === 0) {
      throw new ValidationError('Concept name cannot be empty');
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      throw new ValidationError(`Concept name cannot exceed ${MAX_NAME_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new ConceptName(trimmed, trimmed.toLowerCase());
  }

  get value(): string {
    return this.name;
  }

  get normalized(): string {
    return this.normalizedName;
  }

  equals(other: unknown): boolean {
    return other instanceof ConceptName && other.normalizedName === this.normalizedName;
  }

  toString(): string {
    return this.name;
  }
}
