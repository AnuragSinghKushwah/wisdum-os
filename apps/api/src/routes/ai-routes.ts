import {
  appendMessageCommand,
  getConversationQuery,
  startConversationCommand,
} from '@wisdum/application';
import { ConfigurationError } from '@wisdum/errors';
import type { ConversationRuntime } from '@wisdum/platform-ai';
import type { FastifyInstance } from 'fastify';
import type { AiHandlers } from '../container/tokens.js';
import { actingUserId } from '../middleware/auth-context.js';
import { requireTenantId } from '../middleware/tenant-context.js';
import {
  appendMessageBodySchema,
  conversationIdParamsSchema,
  runTurnBodySchema,
  startConversationBodySchema,
} from '../validation/ai-schemas.js';

interface StartConversationBody {
  readonly provider: string;
  readonly modelName: string;
  readonly ownerId?: string;
  readonly title?: string;
}

interface AppendMessageBody {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

interface RunTurnBody {
  readonly userMessage: string;
  readonly systemPrompt?: string;
  readonly maxContextTokens?: number;
}

export function registerAiRoutes(
  app: FastifyInstance,
  handlers: AiHandlers,
  runtime: ConversationRuntime | undefined,
): void {
  app.post(
    '/v1/conversations',
    { schema: { body: startConversationBodySchema } },
    async (request, reply) => {
      const tenantId = requireTenantId(request);
      const body = request.body as StartConversationBody;
      const result = await handlers.startConversation.execute(
        startConversationCommand({
          ...body,
          tenantId,
          ownerId: actingUserId(request, body.ownerId),
        }),
      );
      await reply.status(201).send(result);
    },
  );

  app.get(
    '/v1/conversations/:id',
    { schema: { params: conversationIdParamsSchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      return handlers.getConversation.execute(
        getConversationQuery({ conversationId: id, tenantId: requireTenantId(request) }),
      );
    },
  );

  app.post(
    '/v1/conversations/:id/messages',
    { schema: { params: conversationIdParamsSchema, body: appendMessageBodySchema } },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as AppendMessageBody;
      await handlers.appendMessage.execute(
        appendMessageCommand({ conversationId: id, ...body, tenantId: requireTenantId(request) }),
      );
      return { status: 'appended' };
    },
  );

  app.post(
    '/v1/conversations/:id/turns',
    { schema: { params: conversationIdParamsSchema, body: runTurnBodySchema } },
    async (request) => {
      if (runtime === undefined) {
        throw new ConfigurationError(
          'No AI provider is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)',
        );
      }
      const { id } = request.params as { id: string };
      const body = request.body as RunTurnBody;
      return runtime.runTurn({ conversationId: id, ...body, tenantId: requireTenantId(request) });
    },
  );
}
