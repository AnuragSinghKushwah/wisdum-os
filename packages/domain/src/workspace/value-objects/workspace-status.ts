import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { WORKSPACE_STATUSES } from '../types/workspace-types.js';
import type { WorkspaceStatusValue } from '../types/workspace-types.js';

/**
 * Lifecycle state machine of a workspace. Archival is reversible;
 * deletion is terminal.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<WorkspaceStatusValue, readonly WorkspaceStatusValue[]>> =
  {
    active: ['archived', 'deleted'],
    archived: ['active', 'deleted'],
    deleted: [],
  };

export class WorkspaceStatus extends ValueObject<WorkspaceStatus> {
  private constructor(private readonly status: WorkspaceStatusValue) {
    super();
  }

  static create(value: string): WorkspaceStatus {
    if (!(WORKSPACE_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown workspace status: ${value}`, {
        value,
        allowed: [...WORKSPACE_STATUSES],
      });
    }
    return new WorkspaceStatus(value as WorkspaceStatusValue);
  }

  static active(): WorkspaceStatus {
    return new WorkspaceStatus('active');
  }

  static archived(): WorkspaceStatus {
    return new WorkspaceStatus('archived');
  }

  static deleted(): WorkspaceStatus {
    return new WorkspaceStatus('deleted');
  }

  get value(): WorkspaceStatusValue {
    return this.status;
  }

  is(value: WorkspaceStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: WorkspaceStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof WorkspaceStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
