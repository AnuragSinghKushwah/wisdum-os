import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/** BCP-47 shape: primary subtag plus optional subtags (`en`, `en-US`, `zh-Hant`). */
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

/**
 * The natural language of a document's content, as a BCP-47 language tag.
 * `und` (undetermined) is the explicit "not yet detected" value — absence
 * is never modeled with null.
 */
export class LanguageCode extends ValueObject<LanguageCode> {
  private constructor(private readonly code: string) {
    super();
  }

  static create(value: string): LanguageCode {
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0) {
      throw new ValidationError('Language code cannot be empty');
    }
    if (!LANGUAGE_PATTERN.test(normalized)) {
      throw new ValidationError('Language code must be a well-formed BCP-47 tag', {
        value: normalized,
      });
    }
    return new LanguageCode(normalized);
  }

  /** ISO 639-2 `und` — language not (yet) determined. */
  static undetermined(): LanguageCode {
    return new LanguageCode('und');
  }

  get value(): string {
    return this.code;
  }

  isUndetermined(): boolean {
    return this.code === 'und';
  }

  equals(other: unknown): boolean {
    return other instanceof LanguageCode && other.code === this.code;
  }

  toString(): string {
    return this.code;
  }
}
