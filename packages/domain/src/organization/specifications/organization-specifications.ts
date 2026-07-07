import type { UUID } from '@wisdum/types';
import { ComposableSpecification } from '../../shared/index.js';
import type { Organization } from '../entities/organization.js';

/** Satisfied when the organization accepts changes and new work. */
export class OrganizationIsActive extends ComposableSpecification<Organization> {
  override isSatisfiedBy(candidate: Organization): boolean {
    return candidate.status.is('active');
  }
}

/** Satisfied when the subscription allows continued use of paid features. */
export class OrganizationIsInGoodStanding extends ComposableSpecification<Organization> {
  override isSatisfiedBy(candidate: Organization): boolean {
    return candidate.subscription.isInGoodStanding();
  }
}

/** Satisfied when the given workspace belongs to the organization. */
export class OrganizationOwnsWorkspace extends ComposableSpecification<Organization> {
  constructor(private readonly workspaceId: UUID) {
    super();
  }

  override isSatisfiedBy(candidate: Organization): boolean {
    return candidate.hasWorkspace(this.workspaceId);
  }
}

/** Satisfied when the organization can be deleted (no workspaces attached). */
export class OrganizationCanBeDeleted extends ComposableSpecification<Organization> {
  override isSatisfiedBy(candidate: Organization): boolean {
    return !candidate.status.is('deleted') && candidate.workspaceCount() === 0;
  }
}
