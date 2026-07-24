import type { CapabilityRegistry } from '@wisdum/kernel';
import type { InputConnector } from '@wisdum/platform-inputs';
import type { CommandHandler } from '../../shared/messages.js';
import { createDocumentCommand } from '../../document/commands/create-document-command.js';
import type { CreateDocumentHandler } from '../../document/handlers/create-document-handler.js';
import { createKnowledgeCommand } from '../../knowledge/commands/create-knowledge-command.js';
import { attachKnowledgeContentCommand } from '../../knowledge/commands/attach-knowledge-content-command.js';
import type { CreateKnowledgeHandler } from '../../knowledge/handlers/create-knowledge-handler.js';
import type { AttachKnowledgeContentHandler } from '../../knowledge/handlers/attach-knowledge-content-handler.js';
import type { KnowledgeReadModel } from '../../knowledge/ports/knowledge-read-model.js';
import type { SyncInputConnectorCommand } from '../commands/sync-input-connector-command.js';

export interface SyncInputConnectorResult {
  readonly captured: number;
  readonly skipped: number;
}

/**
 * Runs one input connector's `capture()` and folds new items into the
 * existing Document/Knowledge pipeline — the same three-call sequence the
 * manual capture UI performs (create Document, create Knowledge, attach).
 * Spans Document, Knowledge, and (via the composition root) Plugin — an
 * application-layer orchestrator, not owned by any single bounded context,
 * the same shape as `RunReasoningPassHandler`.
 *
 * Idempotent by construction: `CreateDocumentHandler` dedupes by content
 * hash, so an unchanged item returns the same `documentId` on every run;
 * if that id is already referenced by an existing Knowledge asset for this
 * tenant, the item is skipped rather than creating a duplicate.
 */
export class SyncInputConnectorHandler implements CommandHandler<
  SyncInputConnectorCommand,
  SyncInputConnectorResult
> {
  constructor(
    private readonly connectors: CapabilityRegistry<InputConnector>,
    private readonly createDocument: CreateDocumentHandler,
    private readonly createKnowledge: CreateKnowledgeHandler,
    private readonly attachContent: AttachKnowledgeContentHandler,
    private readonly knowledgeReads: KnowledgeReadModel,
  ) {}

  async execute(command: SyncInputConnectorCommand): Promise<SyncInputConnectorResult> {
    const connector = this.connectors.require(command.capability);
    const items = await connector.capture();

    const existing = await this.knowledgeReads.listByTenant(command.tenantId);
    const referencedDocumentIds = new Set(
      existing.flatMap((knowledge) => knowledge.contentReferences.map((ref) => ref.reference)),
    );

    let captured = 0;
    let skipped = 0;
    for (const item of items) {
      const { documentId } = await this.createDocument.execute(
        createDocumentCommand({
          tenantId: command.tenantId,
          content: item.body,
          mimeType: item.mimeType,
          encoding: 'utf-8',
        }),
      );
      if (referencedDocumentIds.has(documentId)) {
        skipped += 1;
        continue;
      }

      const { knowledgeId } = await this.createKnowledge.execute(
        createKnowledgeCommand({
          tenantId: command.tenantId,
          title: item.title,
          type: 'document',
          visibility: 'private',
          sourceKind: 'integration',
          sourceUri: item.sourceUrl,
        }),
      );
      await this.attachContent.execute(
        attachKnowledgeContentCommand({
          knowledgeId,
          reference: documentId,
          mimeType: item.mimeType,
        }),
      );
      referencedDocumentIds.add(documentId);
      captured += 1;
    }

    return { captured, skipped };
  }
}
