import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_SUMMARY_LENGTH = 2000;

/** The reasoning conclusion an Insight captures — never empty. */
export class InsightSummary extends ValueObject<InsightSummary> {
  private constructor(private readonly summary: string) {
    super();
  }

  static create(value: string): InsightSummary {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Insight summary cannot be empty');
    }
    if (trimmed.length > MAX_SUMMARY_LENGTH) {
      throw new ValidationError(`Insight summary cannot exceed ${MAX_SUMMARY_LENGTH} characters`, {
        length: trimmed.length,
      });
    }
    return new InsightSummary(trimmed);
  }

  get value(): string {
    return this.summary;
  }

  equals(other: unknown): boolean {
    return other instanceof InsightSummary && other.summary === this.summary;
  }

  toString(): string {
    return this.summary;
  }
}
