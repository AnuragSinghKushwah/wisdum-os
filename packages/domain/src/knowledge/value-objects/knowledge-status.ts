import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { KNOWLEDGE_STATUSES } from '../types/knowledge-types.js';
import type { KnowledgeStatusValue } from '../types/knowledge-types.js';

/**
 * The lifecycle state machine of a knowledge asset. Encodes which transitions
 * are legal; the aggregate consults this map for every state change.
 *
 * Notably: `archived` can never transition to `processing`, and `deleted`
 * is terminal.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<KnowledgeStatusValue, readonly KnowledgeStatusValue[]>> =
  {
    draft: ['importing', 'processing', 'active', 'archived', 'deleted'],
    importing: ['processing', 'active', 'deleted'],
    processing: ['active', 'deleted'],
    active: ['processing', 'archived', 'deleted'],
    archived: ['active', 'deleted'],
    deleted: [],
  };

export class KnowledgeStatus extends ValueObject<KnowledgeStatus> {
  private constructor(private readonly status: KnowledgeStatusValue) {
    super();
  }

  static create(value: string): KnowledgeStatus {
    if (!(KNOWLEDGE_STATUSES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown knowledge status: ${value}`, {
        value,
        allowed: [...KNOWLEDGE_STATUSES],
      });
    }
    return new KnowledgeStatus(value as KnowledgeStatusValue);
  }

  static draft(): KnowledgeStatus {
    return new KnowledgeStatus('draft');
  }

  static importing(): KnowledgeStatus {
    return new KnowledgeStatus('importing');
  }

  static processing(): KnowledgeStatus {
    return new KnowledgeStatus('processing');
  }

  static active(): KnowledgeStatus {
    return new KnowledgeStatus('active');
  }

  static archived(): KnowledgeStatus {
    return new KnowledgeStatus('archived');
  }

  static deleted(): KnowledgeStatus {
    return new KnowledgeStatus('deleted');
  }

  get value(): KnowledgeStatusValue {
    return this.status;
  }

  is(value: KnowledgeStatusValue): boolean {
    return this.status === value;
  }

  canTransitionTo(next: KnowledgeStatus): boolean {
    return ALLOWED_TRANSITIONS[this.status].includes(next.status);
  }

  equals(other: unknown): boolean {
    return other instanceof KnowledgeStatus && other.status === this.status;
  }

  toString(): string {
    return this.status;
  }
}
