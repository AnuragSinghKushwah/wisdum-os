import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import { NotionConnector, RestNotionClient } from '@wisdum/platform-inputs';
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
const NOTION_JOB_NAME = 'notion-database-sync';

const NOTION_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/notion-database-sync',
  capability: 'input.notion',
  displayName: 'Notion Database Sync',
  description: 'Syncs all pages inside a specified database from Notion.',
  version: '1.0.0',
};

/**
 * Wires the Notion Database input connector onto the shared scheduler.
 * Inert unless `NOTION_TOKEN`, `NOTION_DATABASE_ID`, and `NOTION_SYNC_TENANT_ID`
 * are all set.
 */
export class NotionModule implements KernelModule {
  readonly name = 'notion';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const token = optionalEnv('NOTION_TOKEN', '');
    const databaseId = optionalEnv('NOTION_DATABASE_ID', '');
    const tenantId = optionalEnv('NOTION_SYNC_TENANT_ID', '');
    if (token.length === 0 || databaseId.length === 0 || tenantId.length === 0) {
      return;
    }

    const connectors = container.resolve(INPUT_CONNECTORS);
    const client = new RestNotionClient(token);
    const connector = new NotionConnector(client, databaseId);
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

    const logger = createLogger('notion-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: NOTION_JOB_NAME,
      intervalMs: Number(optionalEnv('NOTION_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, NOTION_CAPABILITY);
        if (!enabled) {
          logger.info('Notion sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('Notion sync complete', { captured, skipped });
      },
    });
  }
}
