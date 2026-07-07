import type { IsoTimestamp } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { MESSAGE_ROLES } from '../types/ai-types.js';
import type { MessageRole } from '../types/ai-types.js';
import type { TokenUsage } from './token-usage.js';
import type { ToolCall } from './tool-call.js';

const MAX_CONTENT_LENGTH = 1_000_000;

/**
 * One turn in a conversation. Immutable — conversations are append-only
 * transcripts. Tool calls hang off the assistant message that requested
 * them; usage is attached to model-generated turns.
 */
export class ConversationMessage extends ValueObject<ConversationMessage> {
  private constructor(
    private readonly _role: MessageRole,
    private readonly _content: string,
    private readonly _createdAt: IsoTimestamp,
    private readonly _toolCalls: readonly ToolCall[],
    private readonly _usage?: TokenUsage,
  ) {
    super();
  }

  static create(props: {
    role: MessageRole;
    content: string;
    createdAt: IsoTimestamp;
    toolCalls?: readonly ToolCall[];
    usage?: TokenUsage;
  }): ConversationMessage {
    if (!(MESSAGE_ROLES as readonly string[]).includes(props.role)) {
      throw new ValidationError(`Unknown message role: ${props.role}`, {
        role: props.role,
        allowed: [...MESSAGE_ROLES],
      });
    }
    if (props.content.length > MAX_CONTENT_LENGTH) {
      throw new ValidationError('Message content exceeds the maximum length', {
        length: props.content.length,
      });
    }
    const toolCalls = props.toolCalls ?? [];
    if (toolCalls.length > 0 && props.role !== 'assistant') {
      throw new ValidationError('Only assistant messages can carry tool calls', {
        role: props.role,
      });
    }
    return new ConversationMessage(
      props.role,
      props.content,
      props.createdAt,
      Object.freeze([...toolCalls]),
      props.usage,
    );
  }

  get role(): MessageRole {
    return this._role;
  }

  get content(): string {
    return this._content;
  }

  get createdAt(): IsoTimestamp {
    return this._createdAt;
  }

  get toolCalls(): readonly ToolCall[] {
    return this._toolCalls;
  }

  get usage(): TokenUsage | undefined {
    return this._usage;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ConversationMessage &&
      other._role === this._role &&
      other._content === this._content &&
      other._createdAt === this._createdAt &&
      other._toolCalls.length === this._toolCalls.length &&
      other._toolCalls.every((call, index) => call.equals(this._toolCalls[index])) &&
      (other._usage === undefined
        ? this._usage === undefined
        : this._usage !== undefined && other._usage.equals(this._usage))
    );
  }

  toString(): string {
    return `${this._role}@${this._createdAt}`;
  }
}
