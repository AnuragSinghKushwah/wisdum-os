import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { Identifier } from '../../shared/index.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(kind: string, value: string): UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError(`${kind} must be a valid UUID`, { value });
  }
  return value as UUID;
}

/** Identity of a User aggregate. Validates shape only — generation happens outside the domain. */
export class UserId extends Identifier<'UserId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): UserId {
    return new UserId(assertUuid('UserId', value));
  }
}

/** Identity of a Role aggregate. */
export class RoleId extends Identifier<'RoleId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): RoleId {
    return new RoleId(assertUuid('RoleId', value));
  }
}

/** Identity of a Permission aggregate. */
export class PermissionId extends Identifier<'PermissionId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): PermissionId {
    return new PermissionId(assertUuid('PermissionId', value));
  }
}

/** Identity of an ApiKey aggregate. */
export class ApiKeyId extends Identifier<'ApiKeyId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ApiKeyId {
    return new ApiKeyId(assertUuid('ApiKeyId', value));
  }
}

/** Identity of a ServiceAccount aggregate. */
export class ServiceAccountId extends Identifier<'ServiceAccountId'> {
  private constructor(id: UUID) {
    super(id);
  }

  static create(value: string): ServiceAccountId {
    return new ServiceAccountId(assertUuid('ServiceAccountId', value));
  }
}
