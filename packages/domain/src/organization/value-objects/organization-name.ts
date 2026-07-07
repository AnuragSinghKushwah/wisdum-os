import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIN_LENGTH = 1;
const MAX_LENGTH = 160;

/** Human-readable name of an organization. */
export class OrganizationName extends ValueObject<OrganizationName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): OrganizationName {
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      throw new ValidationError('Organization name cannot be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new ValidationError(`Organization name cannot exceed ${MAX_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new OrganizationName(trimmed);
  }

  get value(): string {
    return this.name;
  }

  equals(other: unknown): boolean {
    return other instanceof OrganizationName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
