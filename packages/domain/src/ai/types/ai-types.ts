/**
 * Literal vocabularies of the AI bounded context. Value objects wrap and
 * validate these; the raw values appear in event payloads.
 */

/** What a model does. Providers may serve several kinds under one roof. */
export const AI_MODEL_KINDS = ['completion', 'embedding', 'ocr', 'speech', 'vision'] as const;
export type AIModelKind = (typeof AI_MODEL_KINDS)[number];

export const CONVERSATION_STATUSES = ['active', 'archived'] as const;
export type ConversationStatusValue = (typeof CONVERSATION_STATUSES)[number];

export const MESSAGE_ROLES = ['system', 'user', 'assistant', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const TOOL_CALL_STATUSES = ['pending', 'succeeded', 'failed'] as const;
export type ToolCallStatusValue = (typeof TOOL_CALL_STATUSES)[number];
