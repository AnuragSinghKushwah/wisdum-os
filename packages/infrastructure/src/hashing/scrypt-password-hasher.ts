import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from '@wisdum/application';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** Hashes credentials with scrypt (Node's built-in KDF). Format: `salt:hash`, both hex. */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plaintext: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const derived = (await scryptAsync(plaintext, salt, KEY_LENGTH)) as Buffer;
    return `${salt.toString('hex')}:${derived.toString('hex')}`;
  }

  async verify(plaintext: string, hash: string): Promise<boolean> {
    const [saltHex, digestHex] = hash.split(':');
    if (saltHex === undefined || digestHex === undefined) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(digestHex, 'hex');
    const derived = (await scryptAsync(plaintext, salt, expected.length)) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  }
}
