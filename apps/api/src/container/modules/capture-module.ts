import { IngestWebhookHandler } from '@wisdum/application';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  CAPTURE_HANDLERS,
  DOCUMENT_HANDLERS,
  KNOWLEDGE_HANDLERS,
  KNOWLEDGE_READ_MODEL,
  REASONING_HANDLERS,
} from '../tokens.js';
import type { CaptureHandlers } from '../tokens.js';

export class CaptureModule implements KernelModule {
  readonly name = 'capture';
  readonly dependsOn = ['knowledge', 'document', 'reasoning'];

  register(container: Container): void {
    const documentHandlers = container.resolve(DOCUMENT_HANDLERS);
    const knowledgeHandlers = container.resolve(KNOWLEDGE_HANDLERS);
    const knowledgeReadModel = container.resolve(KNOWLEDGE_READ_MODEL);
    const reasoningHandlers = container.resolve(REASONING_HANDLERS);

    const ingestWebhook = new IngestWebhookHandler(
      documentHandlers.create,
      knowledgeHandlers.create,
      knowledgeHandlers.attachContent,
      knowledgeReadModel,
      reasoningHandlers.run,
    );

    const handlers: CaptureHandlers = {
      ingestWebhook,
    };

    container.registerValue(CAPTURE_HANDLERS, handlers);
  }
}
