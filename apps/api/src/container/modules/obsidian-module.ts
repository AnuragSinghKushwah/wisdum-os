import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import { ObsidianConnector } from '@wisdum/platform-inputs';
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
const OBSIDIAN_JOB_NAME = 'obsidian-vault-sync';

const OBSIDIAN_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/obsidian-vault-sync',
  capability: 'input.obsidian',
  displayName: 'Obsidian Vault Sync',
  description: 'Syncs all notes inside your local Obsidian vault markdown folder.',
  version: '1.0.0',
};

/**
 * Wires the Obsidian vault input connector onto the shared scheduler.
 * Inert unless `OBSIDIAN_VAULT_PATH` and `OBSIDIAN_SYNC_TENANT_ID`
 * are both set.
 */
export class ObsidianModule implements KernelModule {
  readonly name = 'obsidian';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const vaultPath = optionalEnv('OBSIDIAN_VAULT_PATH', '');
    const tenantId = optionalEnv('OBSIDIAN_SYNC_TENANT_ID', '');
    if (vaultPath.length === 0 || tenantId.length === 0) {
      return;
    }

    const connectors = container.resolve(INPUT_CONNECTORS);
    const connector = new ObsidianConnector({ vaultPath });
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

    const logger = createLogger('obsidian-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: OBSIDIAN_JOB_NAME,
      intervalMs: Number(optionalEnv('OBSIDIAN_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, OBSIDIAN_CAPABILITY);
        if (!enabled) {
          logger.info('Obsidian sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('Obsidian sync complete', { captured, skipped });
      },
    });
  }
}
