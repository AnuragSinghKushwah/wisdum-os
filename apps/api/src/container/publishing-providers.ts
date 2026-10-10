import { CapabilityRegistry } from '@wisdum/kernel';
import { optionalEnv } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';
import {
  DevToPublishingProvider,
  GhostPublishingProvider,
  SubstackPublishingProvider,
  WebsitePublishingProvider,
} from '@wisdum/platform-publishing';
import type { PublishingProvider } from '@wisdum/platform-publishing';

/**
 * Registers the places a draft can be published to.
 *
 * The Wisdum-hosted page is always available. Every other destination is
 * registered only when its credentials are configured, so "Publish" never
 * claims to have posted somewhere it cannot reach; a draft for a destination
 * that is not configured is published to the hosted page instead, and the
 * author copies the text for platforms with no integration (LinkedIn, X).
 */
export function createPublishingProviders(): CapabilityRegistry<PublishingProvider> {
  const registry = new CapabilityRegistry<PublishingProvider>('PublishingProvider');
  const destinations = ['website'];

  const website = new WebsitePublishingProvider({
    publicBaseUrl: optionalEnv('PUBLIC_BASE_URL', 'http://localhost:3000'),
  });
  registry.register(website.capability, website);

  const devtoKey = optionalEnv('DEVTO_API_KEY', '');
  if (devtoKey.length > 0) {
    const devto = new DevToPublishingProvider({ apiKey: devtoKey });
    registry.register(devto.capability, devto);
    destinations.push('devto');
  }

  const ghostKey = optionalEnv('GHOST_API_KEY', '');
  const ghostUrl = optionalEnv('GHOST_ADMIN_API_URL', '');
  if (ghostKey.length > 0 && ghostUrl.length > 0) {
    const ghost = new GhostPublishingProvider({ apiKey: ghostKey, adminApiUrl: ghostUrl });
    registry.register(ghost.capability, ghost);
    destinations.push('ghost');
  }

  const substackUrl = optionalEnv('SUBSTACK_WEBHOOK_URL', '');
  if (substackUrl.length > 0) {
    const substack = new SubstackPublishingProvider({ webhookUrl: substackUrl });
    registry.register(substack.capability, substack);
    destinations.push('substack');
  }

  createLogger('publishing').info('Publishing destinations', { destinations });
  return registry;
}
