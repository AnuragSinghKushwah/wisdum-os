import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthTokenPayload, TokenService } from '@wisdum/application';
import { AuthenticationError } from '@wisdum/application';

const HEADER = { alg: 'HS256', typ: 'JWT' } as const;
const DEFAULT_TTL_SECONDS = 12 * 60 * 60;

interface TokenClaims extends AuthTokenPayload {
  readonly iat: number;
  readonly exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function isTokenClaims(value: unknown): value is TokenClaims {
  if (typeof value !== 'object' || value === null) return false;
  const claims = value as Record<string, unknown>;
  return (
    typeof claims.userId === 'string' &&
    typeof claims.tenantId === 'string' &&
    Array.isArray(claims.roleIds) &&
    typeof claims.exp === 'number'
  );
}

/**
 * Issues and verifies HS256-signed bearer tokens using Node's built-in
 * HMAC primitive, avoiding a third-party JWT dependency for a single
 * well-understood signing scheme.
 */
export class JwtTokenService implements TokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly secret: string,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ) {
    this.ttlSeconds = ttlSeconds;
  }

  async issue(payload: AuthTokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const claims: TokenClaims = { ...payload, iat: now, exp: now + this.ttlSeconds };
    const headerSegment = base64UrlEncode(JSON.stringify(HEADER));
    const payloadSegment = base64UrlEncode(JSON.stringify(claims));
    const signature = this.sign(`${headerSegment}.${payloadSegment}`);
    return Promise.resolve(`${headerSegment}.${payloadSegment}.${signature}`);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new AuthenticationError('Malformed token');
    }
    const [headerSegment, payloadSegment, signatureSegment] = segments as [
      string,
      string,
      string,
    ];

    const expectedSignature = this.sign(`${headerSegment}.${payloadSegment}`);
    const actual = Buffer.from(signatureSegment);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new AuthenticationError('Invalid token signature');
    }

    let claims: unknown;
    try {
      claims = JSON.parse(base64UrlDecode(payloadSegment));
    } catch {
      throw new AuthenticationError('Malformed token payload');
    }
    if (!isTokenClaims(claims)) {
      throw new AuthenticationError('Malformed token payload');
    }
    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new AuthenticationError('Token has expired');
    }

    return Promise.resolve({
      userId: claims.userId,
      tenantId: claims.tenantId,
      roleIds: claims.roleIds,
    });
  }

  private sign(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
