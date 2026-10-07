import { describe, expect, it } from 'vitest';
import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  it('hashes passwords into salted PBKDF2 strings and verifies correctly', () => {
    const rawPassword = 'SuperSecretPassword123!';
    const hash = PasswordHasher.hash(rawPassword);

    expect(hash.startsWith('pbkdf2:100000:')).toBe(true);
    expect(PasswordHasher.verify(rawPassword, hash)).toBe(true);
    expect(PasswordHasher.verify('WrongPassword', hash)).toBe(false);
  });
});
