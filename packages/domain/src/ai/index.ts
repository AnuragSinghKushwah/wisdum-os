import type { DomainDescriptor } from '../shared/index.js';

/** AI bounded context — providers, models, prompts, and conversations. */
export const aiDomain: DomainDescriptor = {
  name: 'ai',
  description: 'AI providers, the model catalog, prompt templates, and conversations.',
};

export * from './types/ai-types.js';
export * from './value-objects/ai-ids.js';
export * from './value-objects/provider-name.js';
export * from './value-objects/model-reference.js';
export * from './value-objects/model-profiles.js';
export * from './value-objects/token-usage.js';
export * from './value-objects/tool-call.js';
export * from './value-objects/conversation-message.js';
export * from './value-objects/prompt-body.js';
export * from './events/ai-events.js';
export * from './entities/ai-provider.js';
export * from './entities/ai-model.js';
export * from './entities/prompt-template.js';
export * from './entities/conversation.js';
export * from './repositories/ai-repositories.js';
export * from './specifications/ai-specifications.js';
