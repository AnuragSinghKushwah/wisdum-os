import { describe, expect, it } from 'vitest';
import { AuthenticationError } from '@wisdum/application';
import { JwtTokenService } from './jwt-token-service.js';

const PAYLOAD = { userId: 'user-1', tenantId: 'tenant-1', roleIds: ['role-1'] };

describe('JwtTokenService', () => {
  it('issues a token that verifies back to the original payload', async () => {
    const service = new JwtTokenService('test-secret');
    const token = await service.issue(PAYLOAD);
    await expect(service.verify(token)).resolves.toEqual(PAYLOAD);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await new JwtTokenService('secret-a').issue(PAYLOAD);
    await expect(new JwtTokenService('secret-b').verify(token)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('rejects a tampered payload segment', async () => {
    const service = new JwtTokenService('test-secret');
    const token = await service.issue(PAYLOAD);
    const [header, , signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...PAYLOAD, roleIds: ['admin'] }),
    ).toString('base64url');
    await expect(service.verify(`${header}.${tamperedPayload}.${signature}`)).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('rejects an expired token', async () => {
    const service = new JwtTokenService('test-secret', -1);
    const token = await service.issue(PAYLOAD);
    await expect(service.verify(token)).rejects.toThrow(AuthenticationError);
  });

  it('rejects a malformed token', async () => {
    const service = new JwtTokenService('test-secret');
    await expect(service.verify('not-a-jwt')).rejects.toThrow(AuthenticationError);
  });
});
