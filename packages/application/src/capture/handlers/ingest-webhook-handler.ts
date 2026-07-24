import type { CommandHandler } from '../../shared/messages.js';
import { createDocumentCommand } from '../../document/commands/create-document-command.js';
import type { CreateDocumentHandler } from '../../document/handlers/create-document-handler.js';
import { createKnowledgeCommand } from '../../knowledge/commands/create-knowledge-command.js';
import { attachKnowledgeContentCommand } from '../../knowledge/commands/attach-knowledge-content-command.js';
import type { CreateKnowledgeHandler } from '../../knowledge/handlers/create-knowledge-handler.js';
import type { AttachKnowledgeContentHandler } from '../../knowledge/handlers/attach-knowledge-content-handler.js';
import type { KnowledgeReadModel } from '../../knowledge/ports/knowledge-read-model.js';
import type { IngestWebhookCommand } from '../commands/ingest-webhook-command.js';
import type { RunReasoningPassHandler } from '../../reasoning/handlers/run-reasoning-pass-handler.js';
import { runReasoningPassCommand } from '../../reasoning/commands/run-reasoning-pass-command.js';
import type { ReasoningResultDto } from '../../reasoning/dto/reasoning-result-dto.js';

export interface IngestWebhookResult {
  readonly knowledgeId: string;
  readonly documentId: string;
  readonly isDuplicate: boolean;
  readonly status: 'created' | 'deduplicated';
  readonly reasoningResult?: ReasoningResultDto;
}

/**
 * Orchestrates inbound content ingestion via webhook or public API (Product Bible §5 & §6).
 * Creates a Document aggregate (deduped by content hash), a Knowledge aggregate, and attaches content.
 * Optionally triggers a reasoning pass when `triggerReasoningPass` is requested.
 */
export class IngestWebhookHandler implements CommandHandler<IngestWebhookCommand, IngestWebhookResult> {
  constructor(
    private readonly createDocument: CreateDocumentHandler,
    private readonly createKnowledge: CreateKnowledgeHandler,
    private readonly attachContent: AttachKnowledgeContentHandler,
    private readonly knowledgeReads: KnowledgeReadModel,
    private readonly runReasoningPass?: RunReasoningPassHandler,
  ) {}

  async execute(command: IngestWebhookCommand): Promise<IngestWebhookResult> {
    const mimeType = command.contentType ?? 'text/markdown';

    // 1. Create or deduplicate Document by content hash
    const { documentId } = await this.createDocument.execute(
      createDocumentCommand({
        tenantId: command.tenantId,
        content: command.content,
        mimeType,
        encoding: 'utf-8',
      }),
    );

    // 2. Check if Knowledge already exists for this document reference
    const existing = await this.knowledgeReads.listByTenant(command.tenantId);
    const existingKnowledge = existing.find((knowledge) =>
      knowledge.contentReferences.some((ref) => ref.reference === documentId),
    );

    if (existingKnowledge !== undefined) {
      return {
        knowledgeId: existingKnowledge.id,
        documentId,
        isDuplicate: true,
        status: 'deduplicated',
      };
    }

    // 3. Create new Knowledge asset
    const sourceKind = command.source === 'github' || command.source === 'notion' || command.source === 'slack' || command.source === 'email'
      ? 'integration'
      : command.source === 'url'
        ? 'url'
        : 'manual';

    const { knowledgeId } = await this.createKnowledge.execute(
      createKnowledgeCommand({
        tenantId: command.tenantId,
        title: command.title,
        type: 'document',
        visibility: 'private',
        labels: command.labels ?? [command.source],
        sourceKind,
        sourceUri: command.sourceUri,
      }),
    );

    // 4. Attach document content to knowledge asset
    await this.attachContent.execute(
      attachKnowledgeContentCommand({
        knowledgeId,
        reference: documentId,
        mimeType,
      }),
    );

    // 5. Trigger optional reasoning pass
    let reasoningResult: ReasoningResultDto | undefined;
    if (command.triggerReasoningPass === true && this.runReasoningPass !== undefined) {
      reasoningResult = await this.runReasoningPass.execute(
        runReasoningPassCommand({ tenantId: command.tenantId }),
      );
    }

    return {
      knowledgeId,
      documentId,
      isDuplicate: false,
      status: 'created',
      reasoningResult,
    };
  }
}
