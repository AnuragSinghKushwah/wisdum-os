export interface OcrRequest {
  readonly imageData: Buffer;
  readonly mimeType: string;
}

export interface OcrResult {
  readonly text: string;
  readonly confidence?: number;
}

/** Optical character recognition behind a vendor-neutral contract. */
export interface OcrProvider {
  recognize(request: OcrRequest): Promise<OcrResult>;
}
