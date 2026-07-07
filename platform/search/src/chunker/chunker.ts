export interface TextChunk {
  readonly index: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface ChunkingOptions {
  readonly maxChunkChars: number;
  readonly overlapChars?: number;
}

/** Splits source text into overlapping windows for embedding and indexing. */
export interface Chunker {
  chunk(text: string, options: ChunkingOptions): readonly TextChunk[];
}
