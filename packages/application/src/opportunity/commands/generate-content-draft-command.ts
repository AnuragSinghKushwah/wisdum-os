import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** The Create step (Product Bible §9): generate a first draft for a proposed opportunity. */
export interface GenerateContentDraftCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly opportunityId: string;
  /** Optional steer from the author (angle, audience, emphasis) passed to the model. */
  readonly instructions?: string;
}

export function generateContentDraftCommand(
  props: Omit<GenerateContentDraftCommand, 'kind'>,
): GenerateContentDraftCommand {
  return { kind: 'command', ...props };
}
