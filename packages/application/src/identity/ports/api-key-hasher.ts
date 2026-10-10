/**
 * Derives the stored identifier of an API key from its plaintext.
 *
 * Unlike a password hash this is deterministic, so a presented key can be
 * found by hashing it and querying `ApiKeyRepository.findByKeyHash`. That is
 * safe only because API keys are long machine-generated secrets (192 bits of
 * entropy), never chosen by a person; user passwords must keep using
 * `PasswordHasher`.
 */
export interface ApiKeyHasher {
  hash(plaintext: string): string;
}
