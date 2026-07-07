/**
 * Computes the integrity hash of document content. The domain models
 * `ContentHash` as a value object but never computes one — hashing is an
 * infrastructure concern implemented behind this port.
 */
export interface ContentHasher {
  hash(content: string): { readonly algorithm: string; readonly digest: string };
}
