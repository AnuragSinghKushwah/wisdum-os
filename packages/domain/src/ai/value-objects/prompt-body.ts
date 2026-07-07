import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

const MAX_BODY_LENGTH = 100_000;
const VARIABLE_PATTERN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/gi;

/**
 * The text of a prompt template with `{{variable}}` placeholders. The body
 * knows its own variables; rendering validates that every placeholder is
 * supplied so broken prompts fail before reaching a model.
 */
export class PromptBody extends ValueObject<PromptBody> {
  private constructor(
    private readonly body: string,
    private readonly _variables: readonly string[],
  ) {
    super();
  }

  static create(value: string): PromptBody {
    if (value.trim().length === 0) {
      throw new ValidationError('Prompt body cannot be empty');
    }
    if (value.length > MAX_BODY_LENGTH) {
      throw new ValidationError(`Prompt body cannot exceed ${MAX_BODY_LENGTH} characters`, {
        length: value.length,
      });
    }
    const variables = [
      ...new Set([...value.matchAll(VARIABLE_PATTERN)].map((match) => match[1] as string)),
    ];
    return new PromptBody(value, Object.freeze(variables));
  }

  get value(): string {
    return this.body;
  }

  /** Distinct placeholder names, in order of first appearance. */
  get variables(): readonly string[] {
    return this._variables;
  }

  /** Substitute every placeholder; missing variables are an error. */
  render(values: Readonly<Record<string, string>>): string {
    const missing = this._variables.filter((variable) => values[variable] === undefined);
    if (missing.length > 0) {
      throw new ValidationError('Prompt variables missing at render time', { missing });
    }
    return this.body.replace(VARIABLE_PATTERN, (_match, name: string) => values[name] as string);
  }

  equals(other: unknown): boolean {
    return other instanceof PromptBody && other.body === this.body;
  }

  toString(): string {
    return this.body;
  }
}
