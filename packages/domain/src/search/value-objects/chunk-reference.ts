import type { UUID } from '@wisdum/types';
import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';

/**
 * A pointer to one chunk of a source document: which document, which chunk,
 * and the character span it covers. Chunking itself (strategy, sizes) is a
 * search-runtime concern; the domain only references the outcome.
 */
export class ChunkReference extends ValueObject<ChunkReference> {
  private constructor(
    private readonly _documentId: UUID,
    private readonly _chunkIndex: number,
    private readonly _startOffset: number,
    private readonly _endOffset: number,
  ) {
    super();
  }

  static create(props: {
    documentId: UUID;
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
  }): ChunkReference {
    if (!Number.isInteger(props.chunkIndex) || props.chunkIndex < 0) {
      throw new ValidationError('Chunk index must be a non-negative integer', {
        chunkIndex: props.chunkIndex,
      });
    }
    if (
      !Number.isInteger(props.startOffset) ||
      !Number.isInteger(props.endOffset) ||
      props.startOffset < 0 ||
      props.endOffset <= props.startOffset
    ) {
      throw new ValidationError('Chunk offsets must form a non-empty range', {
        startOffset: props.startOffset,
        endOffset: props.endOffset,
      });
    }
    return new ChunkReference(
      props.documentId,
      props.chunkIndex,
      props.startOffset,
      props.endOffset,
    );
  }

  get documentId(): UUID {
    return this._documentId;
  }

  get chunkIndex(): number {
    return this._chunkIndex;
  }

  get startOffset(): number {
    return this._startOffset;
  }

  get endOffset(): number {
    return this._endOffset;
  }

  get length(): number {
    return this._endOffset - this._startOffset;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ChunkReference &&
      other._documentId === this._documentId &&
      other._chunkIndex === this._chunkIndex &&
      other._startOffset === this._startOffset &&
      other._endOffset === this._endOffset
    );
  }

  toString(): string {
    return `${this._documentId}#${this._chunkIndex}`;
  }
}
