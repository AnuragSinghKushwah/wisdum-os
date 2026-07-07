import { ValidationError } from '@wisdum/errors';
import { ValueObject } from '../../shared/index.js';
import { HASH_ALGORITHMS } from '../types/document-types.js';
import type { HashAlgorithm } from '../types/document-types.js';

const HEX_PATTERN = /^[0-9a-f]+$/;

/** Expected hex digest length per algorithm. */
const DIGEST_LENGTHS: Readonly<Record<HashAlgorithm, number>> = {
  'sha-256': 64,
  'sha-512': 128,
  blake3: 64,
};

/**
 * Cryptographic digest of a document's content, used for integrity checks
 * and deduplication. The domain never computes hashes — infrastructure
 * does — but it validates their shape and enforces algorithm/digest
 * consistency.
 */
export class ContentHash extends ValueObject<ContentHash> {
  private constructor(
    private readonly algo: HashAlgorithm,
    private readonly hexDigest: string,
  ) {
    super();
  }

  static create(props: { algorithm: string; digest: string }): ContentHash {
    const algorithm = props.algorithm.trim().toLowerCase();
    if (!(HASH_ALGORITHMS as readonly string[]).includes(algorithm)) {
      throw new ValidationError(`Unknown hash algorithm: ${props.algorithm}`, {
        algorithm: props.algorithm,
        allowed: [...HASH_ALGORITHMS],
      });
    }
    const algo = algorithm as HashAlgorithm;

    const digest = props.digest.trim().toLowerCase();
    if (!HEX_PATTERN.test(digest)) {
      throw new ValidationError('Content hash digest must be lowercase hex', { digest });
    }
    if (digest.length !== DIGEST_LENGTHS[algo]) {
      throw new ValidationError(`A ${algo} digest must be ${DIGEST_LENGTHS[algo]} hex characters`, {
        algorithm: algo,
        length: digest.length,
      });
    }
    return new ContentHash(algo, digest);
  }

  get algorithm(): HashAlgorithm {
    return this.algo;
  }

  get digest(): string {
    return this.hexDigest;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof ContentHash && other.algo === this.algo && other.hexDigest === this.hexDigest
    );
  }

  toString(): string {
    return `${this.algo}:${this.hexDigest}`;
  }
}
