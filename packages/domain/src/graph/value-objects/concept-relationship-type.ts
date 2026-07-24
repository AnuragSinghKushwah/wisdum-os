import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { CONCEPT_RELATIONSHIP_TYPES } from '../types/graph-types.js';
import type { ConceptRelationshipTypeValue } from '../types/graph-types.js';

/** The kind of edge between two concepts. Fixed at creation. */
export class ConceptRelationshipType extends ValueObject<ConceptRelationshipType> {
  private constructor(private readonly type: ConceptRelationshipTypeValue) {
    super();
  }

  static create(value: string): ConceptRelationshipType {
    if (!(CONCEPT_RELATIONSHIP_TYPES as readonly string[]).includes(value)) {
      throw new ValidationError(`Unknown concept relationship type: ${value}`, {
        value,
        allowed: [...CONCEPT_RELATIONSHIP_TYPES],
      });
    }
    return new ConceptRelationshipType(value as ConceptRelationshipTypeValue);
  }

  static coOccurs(): ConceptRelationshipType {
    return new ConceptRelationshipType('co_occurs');
  }

  static relatesTo(): ConceptRelationshipType {
    return new ConceptRelationshipType('relates_to');
  }

  static dependsOn(): ConceptRelationshipType {
    return new ConceptRelationshipType('depends_on');
  }

  static extends(): ConceptRelationshipType {
    return new ConceptRelationshipType('extends');
  }

  static contradicts(): ConceptRelationshipType {
    return new ConceptRelationshipType('contradicts');
  }

  static complements(): ConceptRelationshipType {
    return new ConceptRelationshipType('complements');
  }

  static implementedBy(): ConceptRelationshipType {
    return new ConceptRelationshipType('implemented_by');
  }

  get value(): ConceptRelationshipTypeValue {
    return this.type;
  }

  equals(other: unknown): boolean {
    return other instanceof ConceptRelationshipType && other.type === this.type;
  }

  toString(): string {
    return this.type;
  }
}
