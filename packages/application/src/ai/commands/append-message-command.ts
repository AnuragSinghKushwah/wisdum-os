import type { Command } from '../../shared/messages.js';

export interface AppendMessageCommand extends Command {
  readonly kind: 'command';
  readonly conversationId: string;
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export function appendMessageCommand(
  props: Omit<AppendMessageCommand, 'kind'>,
): AppendMessageCommand {
  return { kind: 'command', ...props };
}
