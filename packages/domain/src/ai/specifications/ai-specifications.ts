import { ComposableSpecification } from '../../shared/index.js';
import type { AIModelKind } from '../types/ai-types.js';
import type { AIModel } from '../entities/ai-model.js';
import type { Conversation } from '../entities/conversation.js';

/** Satisfied when the model is enabled and can be routed to. */
export class AIModelIsAvailable extends ComposableSpecification<AIModel> {
  override isSatisfiedBy(candidate: AIModel): boolean {
    return candidate.enabled;
  }
}

/** Satisfied when the model serves the given kind of request. */
export class AIModelIsOfKind extends ComposableSpecification<AIModel> {
  constructor(private readonly kind: AIModelKind) {
    super();
  }

  override isSatisfiedBy(candidate: AIModel): boolean {
    return candidate.kind === this.kind;
  }
}

/** Satisfied when the completion model can call tools. */
export class AIModelSupportsTools extends ComposableSpecification<AIModel> {
  override isSatisfiedBy(candidate: AIModel): boolean {
    return candidate.completionProfile?.supportsTools === true;
  }
}

/** Satisfied when the conversation still accepts new messages. */
export class ConversationIsActive extends ComposableSpecification<Conversation> {
  override isSatisfiedBy(candidate: Conversation): boolean {
    return candidate.status === 'active';
  }
}

/** Satisfied when the conversation has tool calls awaiting execution. */
export class ConversationAwaitsTools extends ComposableSpecification<Conversation> {
  override isSatisfiedBy(candidate: Conversation): boolean {
    return candidate.hasPendingToolCalls();
  }
}

/** Satisfied when accumulated usage exceeds the given token budget. */
export class ConversationExceedsTokenBudget extends ComposableSpecification<Conversation> {
  constructor(private readonly budgetTokens: number) {
    super();
  }

  override isSatisfiedBy(candidate: Conversation): boolean {
    return candidate.totalUsage.totalTokens > this.budgetTokens;
  }
}
