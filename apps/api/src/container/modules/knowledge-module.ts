import {
  ArchiveKnowledgeHandler,
  AttachKnowledgeContentHandler,
  ChangeKnowledgeVisibilityHandler,
  CreateKnowledgeHandler,
  DeleteKnowledgeHandler,
  GetKnowledgeHandler,
  ImportKnowledgeHandler,
  ListKnowledgeHandler,
  PublishKnowledgeHandler,
  UpdateKnowledgeHandler,
} from '@wisdum/application';
import type { KnowledgeReadModel } from '@wisdum/application';
import type { KnowledgeRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryKnowledgeReadModel,
  InMemoryKnowledgeRepository,
  PostgresKnowledgeReadModel,
  PostgresKnowledgeRepository,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import {
  CLOCK,
  EVENT_BUS,
  ID_GENERATOR,
  KNOWLEDGE_HANDLERS,
  KNOWLEDGE_READ_MODEL,
  PG_POOL,
  SLUG_GENERATOR,
  DOCUMENT_REPOSITORY,
} from '../tokens.js';
import type { KnowledgeHandlers } from '../tokens.js';

export class KnowledgeModule implements KernelModule {
  readonly name = 'knowledge';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: KnowledgeRepository;
    let readModel: KnowledgeReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresKnowledgeRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresKnowledgeReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryKnowledgeRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryKnowledgeReadModel(inMemoryRepository);
    }
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);
    const slugs = container.resolve(SLUG_GENERATOR);
    const documentRepository = container.resolve(DOCUMENT_REPOSITORY);

    const handlers: KnowledgeHandlers = {
      create: new CreateKnowledgeHandler(repository, ids, slugs, events, clock),
      update: new UpdateKnowledgeHandler(repository, events, clock),
      delete: new DeleteKnowledgeHandler(repository, events, clock),
      changeVisibility: new ChangeKnowledgeVisibilityHandler(repository, events, clock),
      import: new ImportKnowledgeHandler(repository, events, clock),
      publish: new PublishKnowledgeHandler(repository, events, clock),
      archive: new ArchiveKnowledgeHandler(repository, events, clock),
      get: new GetKnowledgeHandler(readModel),
      list: new ListKnowledgeHandler(readModel),
      attachContent: new AttachKnowledgeContentHandler(repository, documentRepository, events, clock),
    };
    container.registerValue(KNOWLEDGE_HANDLERS, handlers);
    container.registerValue(KNOWLEDGE_READ_MODEL, readModel);
  }
}
