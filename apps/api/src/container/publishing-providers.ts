import { optionalEnv } from '@wisdum/config';
import { CapabilityRegistry } from '@wisdum/kernel';
import {
  WebsitePublishingProvider,
  DevToPublishingProvider,
  GhostPublishingProvider,
  SubstackPublishingProvider,
  LinkedInPublishingProvider,
  TwitterPublishingProvider,
} from '@wisdum/platform-publishing';
import type { PublishingProvider } from '@wisdum/platform-publishing';

/**
 * Statically wires every first-party `PublishingProvider` this deployment
 * ships with.
 */
export function createPublishingProviders(): CapabilityRegistry<PublishingProvider> {
  const registry = new CapabilityRegistry<PublishingProvider>('PublishingProvider');
  const publicBaseUrl = optionalEnv('PUBLIC_BASE_URL', 'http://localhost:3001');
  
  const website = new WebsitePublishingProvider({ publicBaseUrl });
  registry.register(website.capability, website);

  const devtoKey = optionalEnv('DEVTO_API_KEY', 'dev-devto-key');
  const devto = new DevToPublishingProvider({ apiKey: devtoKey });
  registry.register(devto.capability, devto);

  const ghostKey = optionalEnv('GHOST_API_KEY', 'dev-ghost-key');
  const ghostUrl = optionalEnv('GHOST_ADMIN_API_URL', 'http://localhost:2368');
  const ghost = new GhostPublishingProvider({ apiKey: ghostKey, adminApiUrl: ghostUrl });
  registry.register(ghost.capability, ghost);

  const substackUrl = optionalEnv('SUBSTACK_WEBHOOK_URL', 'http://localhost:3001/substack-webhook');
  const substack = new SubstackPublishingProvider({ webhookUrl: substackUrl });
  registry.register(substack.capability, substack);

  const linkedinToken = optionalEnv('LINKEDIN_ACCESS_TOKEN', 'dev-linkedin-token');
  const linkedin = new LinkedInPublishingProvider({ accessToken: linkedinToken });
  registry.register(linkedin.capability, linkedin);

  const twitterKey = optionalEnv('TWITTER_API_KEY', 'dev-twitter-key');
  const twitter = new TwitterPublishingProvider({ apiKey: twitterKey });
  registry.register(twitter.capability, twitter);

  return registry;
}
