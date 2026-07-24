import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import { CapabilityRegistry } from '@wisdum/kernel';
import type { Container, KernelModule } from '@wisdum/kernel';
import { GitHubReadmeConnector, RestGitHubClient } from '@wisdum/platform-inputs';
import type { InputConnector } from '@wisdum/platform-inputs';
import { optionalEnv } from '@wisdum/config';
import { createLogger } from '@wisdum/logger';
import { EventBusDomainEventPublisher } from '@wisdum/infrastructure';
import type { TenantId } from '@wisdum/types';
import {
  CLOCK,
  DOCUMENT_HANDLERS,
  EVENT_BUS,
  ID_GENERATOR,
  INPUT_CONNECTORS,
  KNOWLEDGE_HANDLERS,
  KNOWLEDGE_READ_MODEL,
  PLUGIN_REPOSITORY,
  SCHEDULER,
} from '../tokens.js';

const DEFAULT_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GITHUB_JOB_NAME = 'github-readme-sync';

const GITHUB_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/github-readme-sync',
  capability: 'input.github-readme',
  displayName: 'GitHub README Sync',
  description: 'Captures each configured repository’s README as a Knowledge asset.',
  version: '1.0.0',
};

/**
 * Wires the GitHub README input connector (Product Bible §6) onto the
 * shared scheduler from `SchedulerModule`. Inert unless `GITHUB_TOKEN`,
 * `GITHUB_REPOSITORIES`, and `GITHUB_SYNC_TENANT_ID` are all set — mirrors
 * how `LLM_PROVIDER` degrades to undefined when no AI key is configured.
 * GitHub content isn't inherently tenant-scoped, so v1 uses one global
 * operator-supplied token and repo list, synced into one designated
 * tenant; per-tenant credentials are a separate future phase.
 */
export class GithubModule implements KernelModule {
  readonly name = 'github';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const token = optionalEnv('GITHUB_TOKEN', '');
    const repositoriesRaw = optionalEnv('GITHUB_REPOSITORIES', '');
    const tenantId = optionalEnv('GITHUB_SYNC_TENANT_ID', '');
    if (token.length === 0 || repositoriesRaw.length === 0 || tenantId.length === 0) {
      return;
    }
    const repositories = repositoriesRaw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    const connectors = container.resolve(INPUT_CONNECTORS);
    const client = new RestGitHubClient(token);
    const connector = new GitHubReadmeConnector(client, repositories);
    connectors.register(connector.capability, connector);

    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const provisioner = new CapabilityPluginProvisioner(
      container.resolve(PLUGIN_REPOSITORY),
      ids,
      events,
      clock,
    );

    const handler = new SyncInputConnectorHandler(
      connectors,
      container.resolve(DOCUMENT_HANDLERS).create,
      container.resolve(KNOWLEDGE_HANDLERS).create,
      container.resolve(KNOWLEDGE_HANDLERS).attachContent,
      container.resolve(KNOWLEDGE_READ_MODEL),
    );

    const logger = createLogger('github-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: GITHUB_JOB_NAME,
      intervalMs: Number(optionalEnv('GITHUB_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, GITHUB_CAPABILITY);
        if (!enabled) {
          logger.info('GitHub sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('GitHub sync complete', { captured, skipped });
      },
    });
  }
}
