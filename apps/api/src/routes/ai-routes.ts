import {
  appendMessageCommand,
  getConversationQuery,
  startConversationCommand,
} from '@wisdum/application';
import type { FastifyInstance } from 'fastify';
import type { AiHandlers } from '../container/tokens.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  appendMessageBodySchema,
  conversationIdParamsSchema,
  startConversationBodySchema,
} from '../validation/ai-schemas.js';

interface StartConversationBody {
  readonly provider: string;
  readonly modelName: string;
  readonly ownerId: string;
  readonly title?: string;
}

interface AppendMessageBody {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

export function registerAiRoutes(app: FastifyInstance, handlers: AiHandlers): void {
  app.post(
    '/v1/conversations',
    { schema: { body: startConversationBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as StartConversationBody;
      const result = await handlers.startConversation.execute(
        startConversationCommand({ tenantId, ...body }),
      );
      await reply.status(201).send(result);
    },
  );

  app.get(
    '/v1/conversations/:id',
    { schema: { params: conversationIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.getConversation.execute(getConversationQuery({ conversationId: id }));
    },
  );

  app.post(
    '/v1/conversations/:id/messages',
    { schema: { params: conversationIdParamsSchema, body: appendMessageBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as AppendMessageBody;
      await handlers.appendMessage.execute(appendMessageCommand({ conversationId: id, ...body }));
      return { status: 'appended' };
    },
  );
}
