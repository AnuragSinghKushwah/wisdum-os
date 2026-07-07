import type { UUID } from '@wisdum/types';
import type { PendingDomainEvent } from '../../shared/index.js';
import type { AIModelKind, MessageRole } from '../types/ai-types.js';

/**
 * Domain events of the AI bounded context. Event types follow the platform
 * convention `[domain].[entity].[action]`; payloads carry domain data only,
 * as primitives, so consumers never depend on value object classes.
 */

export const AI_EVENT_SCHEMA_VERSION = 1;

export const AI_PROVIDER_REGISTERED = 'ai.provider.registered';
export const AI_PROVIDER_ENABLED = 'ai.provider.enabled';
export const AI_PROVIDER_DISABLED = 'ai.provider.disabled';
export const AI_MODEL_REGISTERED = 'ai.model.registered';
export const AI_MODEL_ENABLED = 'ai.model.enabled';
export const AI_MODEL_DISABLED = 'ai.model.disabled';
export const PROMPT_TEMPLATE_CREATED = 'ai.prompt-template.created';
export const PROMPT_TEMPLATE_UPDATED = 'ai.prompt-template.updated';
export const CONVERSATION_STARTED = 'ai.conversation.started';
export const CONVERSATION_MESSAGE_APPENDED = 'ai.conversation.message-appended';
export const CONVERSATION_ARCHIVED = 'ai.conversation.archived';

type AIEvent<TType extends string, TPayload> = PendingDomainEvent<TPayload> & {
  readonly eventType: TType;
};

export interface AIProviderRegisteredPayload {
  readonly providerId: UUID;
  readonly name: string;
}
export type AIProviderRegistered = AIEvent<
  typeof AI_PROVIDER_REGISTERED,
  AIProviderRegisteredPayload
>;

export interface AIProviderEnabledPayload {
  readonly providerId: UUID;
  readonly name: string;
}
export type AIProviderEnabled = AIEvent<typeof AI_PROVIDER_ENABLED, AIProviderEnabledPayload>;

export interface AIProviderDisabledPayload {
  readonly providerId: UUID;
  readonly name: string;
}
export type AIProviderDisabled = AIEvent<typeof AI_PROVIDER_DISABLED, AIProviderDisabledPayload>;

export interface AIModelRegisteredPayload {
  readonly modelId: UUID;
  readonly provider: string;
  readonly modelName: string;
  readonly kind: AIModelKind;
}
export type AIModelRegistered = AIEvent<typeof AI_MODEL_REGISTERED, AIModelRegisteredPayload>;

export interface AIModelEnabledPayload {
  readonly modelId: UUID;
}
export type AIModelEnabled = AIEvent<typeof AI_MODEL_ENABLED, AIModelEnabledPayload>;

export interface AIModelDisabledPayload {
  readonly modelId: UUID;
}
export type AIModelDisabled = AIEvent<typeof AI_MODEL_DISABLED, AIModelDisabledPayload>;

export interface PromptTemplateCreatedPayload {
  readonly promptTemplateId: UUID;
  readonly name: string;
  readonly variables: readonly string[];
}
export type PromptTemplateCreated = AIEvent<
  typeof PROMPT_TEMPLATE_CREATED,
  PromptTemplateCreatedPayload
>;

export interface PromptTemplateUpdatedPayload {
  readonly promptTemplateId: UUID;
  readonly revision: number;
  readonly variables: readonly string[];
}
export type PromptTemplateUpdated = AIEvent<
  typeof PROMPT_TEMPLATE_UPDATED,
  PromptTemplateUpdatedPayload
>;

export interface ConversationStartedPayload {
  readonly conversationId: UUID;
  readonly model: string;
}
export type ConversationStarted = AIEvent<typeof CONVERSATION_STARTED, ConversationStartedPayload>;

export interface ConversationMessageAppendedPayload {
  readonly conversationId: UUID;
  readonly role: MessageRole;
  readonly messageIndex: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
}
export type ConversationMessageAppended = AIEvent<
  typeof CONVERSATION_MESSAGE_APPENDED,
  ConversationMessageAppendedPayload
>;

export interface ConversationArchivedPayload {
  readonly conversationId: UUID;
}
export type ConversationArchived = AIEvent<
  typeof CONVERSATION_ARCHIVED,
  ConversationArchivedPayload
>;

export type AnyAIEvent =
  | AIProviderRegistered
  | AIProviderEnabled
  | AIProviderDisabled
  | AIModelRegistered
  | AIModelEnabled
  | AIModelDisabled
  | PromptTemplateCreated
  | PromptTemplateUpdated
  | ConversationStarted
  | ConversationMessageAppended
  | ConversationArchived;
