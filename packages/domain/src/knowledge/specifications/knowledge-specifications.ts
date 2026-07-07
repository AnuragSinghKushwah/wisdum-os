import { ComposableSpecification } from '../../shared/index.js';
import { KnowledgeStatus } from '../value-objects/knowledge-status.js';
import type { Knowledge } from '../entities/knowledge.js';

/** Satisfied when the asset is live and usable. */
export class KnowledgeIsActive extends ComposableSpecification<Knowledge> {
  override isSatisfiedBy(candidate: Knowledge): boolean {
    return candidate.status.is('active');
  }
}

/** Satisfied when the asset is visible beyond its workspace. */
export class KnowledgeIsPublic extends ComposableSpecification<Knowledge> {
  override isSatisfiedBy(candidate: Knowledge): boolean {
    return candidate.visibility.is('public');
  }
}

/** Satisfied when the current lifecycle state allows archiving. */
export class KnowledgeCanBeArchived extends ComposableSpecification<Knowledge> {
  override isSatisfiedBy(candidate: Knowledge): boolean {
    return candidate.status.canTransitionTo(KnowledgeStatus.archived());
  }
}

/** Satisfied when the asset is not already deleted. */
export class KnowledgeCanBeDeleted extends ComposableSpecification<Knowledge> {
  override isSatisfiedBy(candidate: Knowledge): boolean {
    return candidate.status.canTransitionTo(KnowledgeStatus.deleted());
  }
}

/** Satisfied when the current lifecycle state allows processing to start. */
export class KnowledgeIsProcessable extends ComposableSpecification<Knowledge> {
  override isSatisfiedBy(candidate: Knowledge): boolean {
    return candidate.status.canTransitionTo(KnowledgeStatus.processing());
  }
}
