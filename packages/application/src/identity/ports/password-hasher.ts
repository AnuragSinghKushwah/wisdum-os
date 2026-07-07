/**
 * Hashes and verifies credentials. The domain models `PasswordHash` as an
 * opaque value object but never hashes or compares plaintext — that stays
 * behind this port, implemented by infrastructure.
 */
export interface PasswordHasher {
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, hash: string): Promise<boolean>;
}
