/** The verified claims a bearer token carries once issued. */
export interface AuthTokenPayload {
  readonly userId: string;
  readonly tenantId: string;
  readonly roleIds: readonly string[];
}

/**
 * Issues and verifies bearer tokens for authenticated sessions. Signing
 * and verification stay behind this port, implemented by infrastructure.
 */
export interface TokenService {
  issue(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>;
}
