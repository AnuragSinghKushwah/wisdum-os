import { ValidationError } from '@wisdum/errors';
import type { Chunker, ChunkingOptions, TextChunk } from './chunker.js';

/**
 * Splits text into fixed-size, overlapping windows on character
 * boundaries. A production chunker would split on sentence/paragraph
 * boundaries; this is the reference baseline the pipeline is built and
 * tested against.
 */
export class FixedSizeChunker implements Chunker {
  chunk(text: string, options: ChunkingOptions): readonly TextChunk[] {
    if (options.maxChunkChars <= 0) {
      throw new ValidationError('maxChunkChars must be positive', {
        maxChunkChars: options.maxChunkChars,
      });
    }
    const overlap = options.overlapChars ?? 0;
    if (overlap < 0 || overlap >= options.maxChunkChars) {
      throw new ValidationError(
        'overlapChars must be non-negative and smaller than maxChunkChars',
        {
          overlapChars: overlap,
          maxChunkChars: options.maxChunkChars,
        },
      );
    }
    if (text.length === 0) return [];

    const stride = options.maxChunkChars - overlap;
    const chunks: TextChunk[] = [];
    let index = 0;
    for (let start = 0; start < text.length; start += stride) {
      const end = Math.min(start + options.maxChunkChars, text.length);
      chunks.push({ index, text: text.slice(start, end), startOffset: start, endOffset: end });
      index += 1;
      if (end === text.length) break;
    }
    return chunks;
  }
}
