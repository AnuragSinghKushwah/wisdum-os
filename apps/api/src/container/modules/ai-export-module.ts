import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import { AiExportConnector } from '@wisdum/platform-inputs';
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
const AI_EXPORT_JOB_NAME = 'ai-export-sync';

const AI_EXPORT_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/ai-export-sync',
  capability: 'input.ai-export',
  displayName: 'AI Chat Export Sync',
  description: 'Syncs exported Claude and ChatGPT conversation files from a local directory.',
  version: '1.0.0',
};

/**
 * Wires the Claude/ChatGPT conversation exports input connector onto the shared scheduler.
 * Inert unless `AI_EXPORT_DIRECTORY_PATH` and `AI_EXPORT_SYNC_TENANT_ID`
 * are both set.
 */
export class AiExportModule implements KernelModule {
  readonly name = 'ai-export';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const exportDirectory = optionalEnv('AI_EXPORT_DIRECTORY_PATH', '');
    const tenantId = optionalEnv('AI_EXPORT_SYNC_TENANT_ID', '');
    if (exportDirectory.length === 0 || tenantId.length === 0) {
      return;
    }

    const connectors = container.resolve(INPUT_CONNECTORS);
    const connector = new AiExportConnector({ exportDirectory });
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

    const logger = createLogger('ai-export-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: AI_EXPORT_JOB_NAME,
      intervalMs: Number(optionalEnv('AI_EXPORT_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, AI_EXPORT_CAPABILITY);
        if (!enabled) {
          logger.info('AI Export sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('AI Export sync complete', { captured, skipped });
      },
    });
  }
}
