/** The verified identity behind a presented API key. */
export interface ApiKeyPrincipalDto {
  readonly apiKeyId: string;
  readonly tenantId: string;
  readonly ownerId: string;
  readonly ownerType: 'user' | 'service-account';
  /** Permission names the key may exercise, e.g. `knowledge:write`. */
  readonly scopes: readonly string[];
}
