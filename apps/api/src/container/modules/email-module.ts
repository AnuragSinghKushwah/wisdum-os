import {
  CapabilityPluginProvisioner,
  SyncInputConnectorHandler,
  syncInputConnectorCommand,
} from '@wisdum/application';
import type { DefaultCapabilityManifest } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import { EmailConnector } from '@wisdum/platform-inputs';
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
const EMAIL_JOB_NAME = 'email-sync';

const EMAIL_CAPABILITY: DefaultCapabilityManifest = {
  pluginName: 'wisdum/email-sync',
  capability: 'input.email',
  displayName: 'Email Sync',
  description: 'Syncs emails from Gmail/IMAP into Wisdum knowledge cards.',
  version: '1.0.0',
};

export class EmailModule implements KernelModule {
  readonly name = 'email';
  readonly dependsOn = ['core', 'scheduler', 'knowledge', 'document', 'plugin'];

  register(container: Container): void {
    const tenantId = optionalEnv('EMAIL_SYNC_TENANT_ID', '');
    if (tenantId.length === 0) {
      return;
    }

    const connectors = container.resolve(INPUT_CONNECTORS);
    const connector = new EmailConnector({
      username: optionalEnv('EMAIL_IMAP_USERNAME', ''),
    });
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

    const logger = createLogger('email-sync');
    const syncTenantId = tenantId as TenantId;

    container.resolve(SCHEDULER).registerJob({
      name: EMAIL_JOB_NAME,
      intervalMs: Number(optionalEnv('EMAIL_SYNC_INTERVAL_MS', String(DEFAULT_SYNC_INTERVAL_MS))),
      task: async () => {
        const enabled = await provisioner.ensureEnabled(syncTenantId, EMAIL_CAPABILITY);
        if (!enabled) {
          logger.info('Email sync skipped — capability disabled for tenant', {
            tenantId: syncTenantId,
          });
          return;
        }
        const { captured, skipped } = await handler.execute(
          syncInputConnectorCommand({ tenantId: syncTenantId, capability: connector.capability }),
        );
        logger.info('Email sync complete', { captured, skipped });
      },
    });
  }
}
