import type { IsoTimestamp, UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { WORKSPACE_MEMBER_ROLES } from '../types/workspace-types.js';
import type { WorkspaceMemberRole } from '../types/workspace-types.js';

/**
 * A user's membership in a workspace: who, in what capacity, since when.
 * Value object — membership has no identity of its own; the pair
 * (workspace, user) is unique inside the aggregate.
 */
export class WorkspaceMember extends ValueObject<WorkspaceMember> {
  private constructor(
    private readonly _userId: UUID,
    private readonly _role: WorkspaceMemberRole,
    private readonly _joinedAt: IsoTimestamp,
  ) {
    super();
  }

  static create(props: {
    userId: UUID;
    role: WorkspaceMemberRole;
    joinedAt: IsoTimestamp;
  }): WorkspaceMember {
    if (!(WORKSPACE_MEMBER_ROLES as readonly string[]).includes(props.role)) {
      throw new ValidationError(`Unknown workspace member role: ${props.role}`, {
        role: props.role,
        allowed: [...WORKSPACE_MEMBER_ROLES],
      });
    }
    return new WorkspaceMember(props.userId, props.role, props.joinedAt);
  }

  get userId(): UUID {
    return this._userId;
  }

  get role(): WorkspaceMemberRole {
    return this._role;
  }

  get joinedAt(): IsoTimestamp {
    return this._joinedAt;
  }

  /** New membership value with a different role; joinedAt is preserved. */
  withRole(role: WorkspaceMemberRole): WorkspaceMember {
    return new WorkspaceMember(this._userId, role, this._joinedAt);
  }

  isOwner(): boolean {
    return this._role === 'owner';
  }

  /** Whether the member can administer the workspace (owners and admins). */
  canAdminister(): boolean {
    return this._role === 'owner' || this._role === 'admin';
  }

  equals(other: unknown): boolean {
    return (
      other instanceof WorkspaceMember &&
      other._userId === this._userId &&
      other._role === this._role &&
      other._joinedAt === this._joinedAt
    );
  }

  toString(): string {
    return `${this._userId}:${this._role}`;
  }
}
