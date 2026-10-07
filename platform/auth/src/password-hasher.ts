import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export class PasswordHasher {
  private static readonly ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 64;
  private static readonly DIGEST = 'sha512';

  /**
   * Hashes a raw plaintext password into a salted, formatted string:
   * `pbkdf2:iterations:salt:hash`
   */
  static hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(
      password,
      salt,
      PasswordHasher.ITERATIONS,
      PasswordHasher.KEY_LENGTH,
      PasswordHasher.DIGEST,
    ).toString('hex');

    return `pbkdf2:${PasswordHasher.ITERATIONS}:${salt}:${hash}`;
  }

  /**
   * Verifies a raw plaintext password against a stored formatted hash.
   */
  static verify(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[1] ?? '100000', 10);
    const salt = parts[2] ?? '';
    const originalHash = parts[3] ?? '';

    if (!salt || !originalHash) {
      return false;
    }

    const testHash = pbkdf2Sync(
      password,
      salt,
      iterations,
      PasswordHasher.KEY_LENGTH,
      PasswordHasher.DIGEST,
    ).toString('hex');

    return timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(testHash, 'hex'));
  }
}
