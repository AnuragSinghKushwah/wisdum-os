import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublishingProviders } from './publishing-providers.js';

const DESTINATION_ENV = [
  'DEVTO_API_KEY',
  'GHOST_API_KEY',
  'GHOST_ADMIN_API_URL',
  'SUBSTACK_WEBHOOK_URL',
];

afterEach(() => {
  vi.unstubAllEnvs();
});

function blankDestinations(): void {
  for (const name of DESTINATION_ENV) vi.stubEnv(name, '');
}

describe('createPublishingProviders', () => {
  it('offers only the Wisdum-hosted page until a destination is configured', () => {
    blankDestinations();

    const providers = createPublishingProviders();

    expect(providers.resolve('publishing.website')).toBeDefined();
    for (const capability of [
      'publishing.devto',
      'publishing.ghost',
      'publishing.substack',
      'publishing.linkedin',
      'publishing.twitter',
    ]) {
      expect(providers.resolve(capability), capability).toBeUndefined();
    }
  });

  it('adds a destination only when its credentials are present', () => {
    blankDestinations();
    vi.stubEnv('DEVTO_API_KEY', 'a-real-key');
    vi.stubEnv('GHOST_API_KEY', 'id:secret');
    vi.stubEnv('GHOST_ADMIN_API_URL', '');

    const providers = createPublishingProviders();

    expect(providers.resolve('publishing.devto')).toBeDefined();
    expect(providers.resolve('publishing.ghost')).toBeUndefined();
  });

  it('enables Ghost only with both its key and its URL', () => {
    blankDestinations();
    vi.stubEnv('GHOST_API_KEY', 'id:secret');
    vi.stubEnv('GHOST_ADMIN_API_URL', 'https://blog.example.com');

    expect(createPublishingProviders().resolve('publishing.ghost')).toBeDefined();
  });
});
