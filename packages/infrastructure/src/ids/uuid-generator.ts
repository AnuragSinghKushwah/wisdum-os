import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '@wisdum/application';
import type { UUID } from '@wisdum/types';

/** Generates RFC 4122 v4 UUIDs via Node's built-in crypto module. */
export class UuidGenerator implements IdGenerator {
  nextId(): UUID {
    return randomUUID() as UUID;
  }
}
