import type { UUID } from '@wisdum/types';
import { ComposableSpecification } from '../../shared/index.js';
import type { Workspace } from '../entities/workspace.js';

/** Satisfied when the workspace accepts changes and new work. */
export class WorkspaceIsActive extends ComposableSpecification<Workspace> {
  override isSatisfiedBy(candidate: Workspace): boolean {
    return candidate.status.is('active');
  }
}

/** Satisfied when the given user belongs to the workspace. */
export class WorkspaceHasMember extends ComposableSpecification<Workspace> {
  constructor(private readonly userId: UUID) {
    super();
  }

  override isSatisfiedBy(candidate: Workspace): boolean {
    return candidate.isMember(this.userId);
  }
}

/** Satisfied when another member can still join under the member limit. */
export class WorkspaceCanAcceptMember extends ComposableSpecification<Workspace> {
  override isSatisfiedBy(candidate: Workspace): boolean {
    return candidate.limits.allowsMemberCount(candidate.memberCount() + 1);
  }
}

/** Satisfied when the given feature flag is enabled for the workspace. */
export class WorkspaceHasFeature extends ComposableSpecification<Workspace> {
  constructor(private readonly flag: string) {
    super();
  }

  override isSatisfiedBy(candidate: Workspace): boolean {
    return candidate.featureFlags.isEnabled(this.flag);
  }
}
