import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import { SlackConnector } from '@wisdum/platform-inputs';
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

const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SLACK_JOB_NAME = 'slack-channel-sync';

const SLACK_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/slack-channel-sync',
  capability: 'input.slack',
  displayName: 'Slack Channel Sync',
  description: 'Syncs all messages and threads inside a specified Slack channel.',
  version: '1.0.0',
};

/**
 * Wires the Slack channel input connector onto the shared scheduler.
 * Inert unless `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, and `SLACK_SYNC_TENANT_ID`
 * are all set.
 */
export class SlackModule implements KernelModule {
  readonly name = 'slack';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const token = optionalEnv('SLACK_BOT_TOKEN', '');
    const channelId = optionalEnv('SLACK_CHANNEL_ID', '');
    const tenantId = optionalEnv('SLACK_SYNC_TENANT_ID', '');
    if (token.length === 0 || channelId.length === 0 || tenantId.length === 0) {
      return;
    }

    const connectors = container.resolve(INPUT_CONNECTORS);
    const connector = new SlackConnector({ botToken: token, channelId });
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

    const logger = createLogger('slack-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: SLACK_JOB_NAME,
      intervalMs: Number(optionalEnv('SLACK_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, SLACK_CAPABILITY);
        if (!enabled) {
          logger.info('Slack sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('Slack sync complete', { captured, skipped });
      },
    });
  }
}
