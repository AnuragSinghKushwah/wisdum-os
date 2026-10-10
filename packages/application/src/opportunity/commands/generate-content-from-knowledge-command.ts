import type { TenantId } from '@wisdum/types';
import type { Command } from '../../shared/messages.js';

/**
 * Turn one knowledge asset into a draft for each chosen platform, all written
 * from the asset's own text.
 */
export interface GenerateContentFromKnowledgeCommand extends Command {
  readonly kind: 'command';
  readonly tenantId: TenantId;
  readonly knowledgeId: string;
  /** Opportunity type values, e.g. `linkedin_post`, `newsletter`, `x_thread`. */
  readonly platforms: readonly string[];
  /** Optional steer from the author (angle, audience, emphasis) applied to every draft. */
  readonly instructions?: string;
}

export function generateContentFromKnowledgeCommand(
  props: Omit<GenerateContentFromKnowledgeCommand, 'kind'>,
): GenerateContentFromKnowledgeCommand {
  return { kind: 'command', ...props };
}
