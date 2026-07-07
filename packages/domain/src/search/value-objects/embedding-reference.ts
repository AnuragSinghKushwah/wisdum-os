import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import type { ChunkReference } from './chunk-reference.js';

const MAX_VECTOR_KEY = 255;
const MAX_MODEL_REF = 192;

/**
 * A pointer to a stored embedding: which chunk it embeds, which model
 * produced it, and its key in the vector store. Vectors themselves never
 * enter the domain — they live in infrastructure.
 */
export class EmbeddingReference extends ValueObject<EmbeddingReference> {
  private constructor(
    private readonly _chunk: ChunkReference,
    private readonly _model: string,
    private readonly _dimensions: number,
    private readonly _vectorKey: string,
  ) {
    super();
  }

  static create(props: {
    chunk: ChunkReference;
    /** Fully qualified model reference, e.g. `anthropic/voyage-3`. */
    model: string;
    dimensions: number;
    vectorKey: string;
  }): EmbeddingReference {
    const model = props.model.trim().toLowerCase();
    if (model.length === 0 || model.length > MAX_MODEL_REF) {
      throw new ValidationError('Embedding model reference is missing or too long', {
        length: model.length,
      });
    }
    if (!Number.isInteger(props.dimensions) || props.dimensions <= 0) {
      throw new ValidationError('Embedding dimensions must be a positive integer', {
        dimensions: props.dimensions,
      });
    }
    const vectorKey = props.vectorKey.trim();
    if (vectorKey.length === 0 || vectorKey.length > MAX_VECTOR_KEY) {
      throw new ValidationError('Vector key is missing or too long', {
        length: vectorKey.length,
      });
    }
    return new EmbeddingReference(props.chunk, model, props.dimensions, vectorKey);
  }

  get chunk(): ChunkReference {
    return this._chunk;
  }

  get model(): string {
    return this._model;
  }

  get dimensions(): number {
    return this._dimensions;
  }

  get vectorKey(): string {
    return this._vectorKey;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof EmbeddingReference &&
      other._chunk.equals(this._chunk) &&
      other._model === this._model &&
      other._dimensions === this._dimensions &&
      other._vectorKey === this._vectorKey
    );
  }

  toString(): string {
    return `${this._chunk.toString()}@${this._model}`;
  }
}
