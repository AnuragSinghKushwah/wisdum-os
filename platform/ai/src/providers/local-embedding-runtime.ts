import { pipeline } from '@xenova/transformers';
import type { FeatureExtractor } from './local-embedding-provider.js';

/**
 * Loads a local sentence-transformer model and returns a closure that runs
 * it per call. This is the only file in the package that imports
 * `@xenova/transformers`.
 */
export async function loadLocalFeatureExtractor(model: string): Promise<FeatureExtractor> {
  const extractor = await pipeline('feature-extraction', model);

  return async (text: string): Promise<readonly number[]> => {
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  };
}

/**
 * A `FeatureExtractor` that defers the (multi-second, first-run-downloads-
 * the-model) load until the first embed call, instead of blocking kernel
 * startup. `KernelModule.register()` is synchronous, so this is what lets
 * `createEmbeddingProvider()` stay synchronous like `createLlmProvider()` —
 * the cost lands on the first document upload rather than server boot.
 */
export function createLazyLocalFeatureExtractor(model: string): FeatureExtractor {
  let loading: Promise<FeatureExtractor> | undefined;

  return async (text: string): Promise<readonly number[]> => {
    if (loading === undefined) {
      loading = loadLocalFeatureExtractor(model);
    }
    const extractor = await loading;
    return extractor(text);
  };
}
