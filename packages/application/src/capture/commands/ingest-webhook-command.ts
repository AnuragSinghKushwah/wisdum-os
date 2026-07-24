import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** Ingests external content via webhook or public API into Knowledge & Document (Product Bible §5 & §6). */
export interface IngestWebhookCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly source: string;
  readonly title: string;
  readonly content: string;
  readonly contentType?: string;
  readonly sourceUri?: string;
  readonly labels?: readonly string[];
  readonly triggerReasoningPass?: boolean;
}

export function ingestWebhookCommand(
  props: Omit<IngestWebhookCommand, 'kind'>,
): IngestWebhookCommand {
  return { kind: 'command', ...props };
}
