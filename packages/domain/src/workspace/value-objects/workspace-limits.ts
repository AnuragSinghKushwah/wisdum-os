import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/**
 * Resource ceilings for a workspace. Limits are quota policy handed down
 * from the organization (which owns the subscription); the workspace only
 * enforces them. `undefined` means unlimited.
 */
export interface WorkspaceLimitsProps {
  readonly maxMembers?: number;
  readonly maxKnowledgeAssets?: number;
  readonly maxStorageBytes?: number;
}

export class WorkspaceLimits extends ValueObject<WorkspaceLimits> {
  private constructor(private readonly props: Readonly<WorkspaceLimitsProps>) {
    super();
  }

  static create(props: WorkspaceLimitsProps = {}): WorkspaceLimits {
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new ValidationError(`Limit '${key}' must be a non-negative integer`, {
          key,
          value,
        });
      }
    }
    return new WorkspaceLimits(Object.freeze({ ...props }));
  }

  static unlimited(): WorkspaceLimits {
    return new WorkspaceLimits(Object.freeze({}));
  }

  get maxMembers(): number | undefined {
    return this.props.maxMembers;
  }

  get maxKnowledgeAssets(): number | undefined {
    return this.props.maxKnowledgeAssets;
  }

  get maxStorageBytes(): number | undefined {
    return this.props.maxStorageBytes;
  }

  allowsMemberCount(count: number): boolean {
    return this.props.maxMembers === undefined || count <= this.props.maxMembers;
  }

  equals(other: unknown): boolean {
    return other instanceof WorkspaceLimits && this.deepEquals(other.props, this.props);
  }

  toString(): string {
    return JSON.stringify(this.props);
  }
}
