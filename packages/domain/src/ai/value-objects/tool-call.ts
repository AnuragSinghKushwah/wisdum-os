import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { TOOL_CALL_STATUSES } from '../types/ai-types.js';
import type { ToolCallStatusValue } from '../types/ai-types.js';

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/i;
const MAX_TOOL_NAME = 128;

/**
 * One tool invocation requested by a model inside a conversation turn.
 * Arguments and result are opaque JSON strings — the domain records what
 * happened; executing tools is the AI runtime's job.
 */
export class ToolCall extends ValueObject<ToolCall> {
  private constructor(
    private readonly _toolName: string,
    private readonly _argumentsJson: string,
    private readonly _status: ToolCallStatusValue,
    private readonly _resultJson?: string,
  ) {
    super();
  }

  static create(props: {
    toolName: string;
    argumentsJson: string;
    status?: ToolCallStatusValue;
    resultJson?: string;
  }): ToolCall {
    const toolName = props.toolName.trim();
    if (toolName.length === 0 || toolName.length > MAX_TOOL_NAME) {
      throw new ValidationError('Tool name is missing or too long', { length: toolName.length });
    }
    if (!TOOL_NAME_PATTERN.test(toolName)) {
      throw new ValidationError('Tool name contains invalid characters', { value: toolName });
    }
    const status = props.status ?? 'pending';
    if (!(TOOL_CALL_STATUSES as readonly string[]).includes(status)) {
      throw new ValidationError(`Unknown tool call status: ${status}`, {
        status,
        allowed: [...TOOL_CALL_STATUSES],
      });
    }
    return new ToolCall(toolName, props.argumentsJson, status, props.resultJson);
  }

  get toolName(): string {
    return this._toolName;
  }

  get argumentsJson(): string {
    return this._argumentsJson;
  }

  get status(): ToolCallStatusValue {
    return this._status;
  }

  get resultJson(): string | undefined {
    return this._resultJson;
  }

  /** New value recording a successful execution. */
  succeededWith(resultJson: string): ToolCall {
    return new ToolCall(this._toolName, this._argumentsJson, 'succeeded', resultJson);
  }

  /** New value recording a failed execution. */
  failedWith(errorJson: string): ToolCall {
    return new ToolCall(this._toolName, this._argumentsJson, 'failed', errorJson);
  }

  isPending(): boolean {
    return this._status === 'pending';
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ToolCall &&
      other._toolName === this._toolName &&
      other._argumentsJson === this._argumentsJson &&
      other._status === this._status &&
      other._resultJson === this._resultJson
    );
  }

  toString(): string {
    return `${this._toolName}(${this._status})`;
  }
}
