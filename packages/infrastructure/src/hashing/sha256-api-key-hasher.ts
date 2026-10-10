import { createHash } from 'node:crypto';
import type { ApiKeyHasher } from '@wisdum/application';

/** Hashes API keys with SHA-256 so they can be looked up by their digest. */
export class Sha256ApiKeyHasher implements ApiKeyHasher {
  hash(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }
}
