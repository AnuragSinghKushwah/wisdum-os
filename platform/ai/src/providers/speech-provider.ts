export interface TranscriptionRequest {
  readonly audioData: Buffer;
  readonly mimeType: string;
  readonly language?: string;
}

export interface TranscriptionResult {
  readonly text: string;
  readonly language?: string;
}

export interface SynthesisRequest {
  readonly text: string;
  readonly voice?: string;
}

export interface SynthesisResult {
  readonly audioData: Buffer;
  readonly mimeType: string;
}

/** Speech-to-text and text-to-speech behind a vendor-neutral contract. */
export interface SpeechProvider {
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>;
  synthesize(request: SynthesisRequest): Promise<SynthesisResult>;
}
