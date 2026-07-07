import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MIN_LENGTH = 1;
const MAX_LENGTH = 120;

/** Human-readable name of a workspace. */
export class WorkspaceName extends ValueObject<WorkspaceName> {
  private constructor(private readonly name: string) {
    super();
  }

  static create(value: string): WorkspaceName {
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) {
      throw new ValidationError('Workspace name cannot be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new ValidationError(`Workspace name cannot exceed ${MAX_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new WorkspaceName(trimmed);
  }

  get value(): string {
    return this.name;
  }

  equals(other: unknown): boolean {
    return other instanceof WorkspaceName && other.name === this.name;
  }

  toString(): string {
    return this.name;
  }
}
