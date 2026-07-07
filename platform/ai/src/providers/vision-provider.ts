export interface VisionAnalysisRequest {
  readonly imageData: Buffer;
  readonly mimeType: string;
  readonly prompt?: string;
}

export interface VisionAnalysisResult {
  readonly description: string;
  readonly labels: readonly string[];
}

/** Image understanding behind a vendor-neutral contract. */
export interface VisionProvider {
  analyze(request: VisionAnalysisRequest): Promise<VisionAnalysisResult>;
}
