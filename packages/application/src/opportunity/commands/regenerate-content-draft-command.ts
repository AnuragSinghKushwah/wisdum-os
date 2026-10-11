import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/** Writes a draft's text again from its source, replacing the current text. */
export interface RegenerateContentDraftCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly draftId: string;
  /** Optional steer from the author (angle, audience, emphasis) passed to the model. */
  readonly instructions?: string;
}

export function regenerateContentDraftCommand(
  props: Omit<RegenerateContentDraftCommand, 'kind'>,
): RegenerateContentDraftCommand {
  return { kind: 'command', ...props };
}
