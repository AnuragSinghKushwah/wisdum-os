import { createHash } from 'node:crypto';
import type { ContentHasher } from '@wisdum/application';

/** Computes SHA-256 content hashes. */
export class Sha256ContentHasher implements ContentHasher {
  hash(content: string): { algorithm: string; digest: string } {
    return { algorithm: 'sha-256', digest: createHash('sha256').update(content).digest('hex') };
  }
}
