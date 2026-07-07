import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { KNOWLEDGE_SOURCE_KINDS } from '../types/knowledge-types.js';
import type { KnowledgeSourceKind } from '../types/knowledge-types.js';

const URL_PATTERN = /^https?:\/\/\S+$/i;
const MAX_URI_LENGTH = 2000;

/**
 * Where a knowledge asset came from: created manually, uploaded, captured
 * from a URL, or synced through an integration. A `url` source requires a
 * well-formed http(s) URI; other kinds may carry an opaque reference.
 */
export class KnowledgeSource extends ValueObject<KnowledgeSource> {
  private constructor(
    private readonly sourceKind: KnowledgeSourceKind,
    private readonly sourceUri: string | null,
  ) {
    super();
  }

  static create(props: { kind: string; uri?: string | null }): KnowledgeSource {
    if (!(KNOWLEDGE_SOURCE_KINDS as readonly string[]).includes(props.kind)) {
      throw new ValidationError(`Unknown knowledge source kind: ${props.kind}`, {
        kind: props.kind,
        allowed: [...KNOWLEDGE_SOURCE_KINDS],
      });
    }
    const kind = props.kind as KnowledgeSourceKind;

    const trimmed = props.uri?.trim() ?? '';
    const uri = trimmed.length > 0 ? trimmed : null;

    if (uri !== null && uri.length > MAX_URI_LENGTH) {
      throw new ValidationError(`Knowledge source URI cannot exceed ${MAX_URI_LENGTH} characters`, {
        length: uri.length,
      });
    }
    if (kind === 'url') {
      if (uri === null) {
        throw new ValidationError('A URL knowledge source requires a URI');
      }
      if (!URL_PATTERN.test(uri)) {
        throw new ValidationError('A URL knowledge source requires a well-formed http(s) URI', {
          uri,
        });
      }
    }

    return new KnowledgeSource(kind, uri);
  }

  static manual(): KnowledgeSource {
    return new KnowledgeSource('manual', null);
  }

  get kind(): KnowledgeSourceKind {
    return this.sourceKind;
  }

  get uri(): string | null {
    return this.sourceUri;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof KnowledgeSource &&
      other.sourceKind === this.sourceKind &&
      other.sourceUri === this.sourceUri
    );
  }

  toString(): string {
    return this.sourceUri === null ? this.sourceKind : `${this.sourceKind}:${this.sourceUri}`;
  }
}
