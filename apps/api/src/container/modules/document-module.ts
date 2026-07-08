import {
  CreateDocumentHandler,
  GetDocumentHandler,
  ReplaceDocumentContentHandler,
} from '@wisdum/application';
import type { DocumentReadModel } from '@wisdum/application';
import type { DocumentRepository } from '@wisdum/domain';
import {
  EventBusDomainEventPublisher,
  InMemoryDocumentReadModel,
  InMemoryDocumentRepository,
  PostgresDocumentReadModel,
  PostgresDocumentRepository,
  Sha256ContentHasher,
} from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import { CLOCK, DOCUMENT_HANDLERS, EVENT_BUS, ID_GENERATOR, PG_POOL } from '../tokens.js';
import type { DocumentHandlers } from '../tokens.js';

export class DocumentModule implements KernelModule {
  readonly name = 'document';
  readonly dependsOn = ['core'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    let repository: DocumentRepository;
    let readModel: DocumentReadModel;
    if (pool !== undefined) {
      const postgresRepository = new PostgresDocumentRepository(pool);
      repository = postgresRepository;
      readModel = new PostgresDocumentReadModel(postgresRepository);
    } else {
      const inMemoryRepository = new InMemoryDocumentRepository();
      repository = inMemoryRepository;
      readModel = new InMemoryDocumentReadModel(inMemoryRepository);
    }
    const hasher = new Sha256ContentHasher();
    const events = new EventBusDomainEventPublisher(container.resolve(EVENT_BUS));
    const clock = container.resolve(CLOCK);
    const ids = container.resolve(ID_GENERATOR);

    const handlers: DocumentHandlers = {
      create: new CreateDocumentHandler(repository, ids, hasher, events, clock),
      replaceContent: new ReplaceDocumentContentHandler(repository, hasher, events, clock),
      get: new GetDocumentHandler(readModel),
    };
    container.registerValue(DOCUMENT_HANDLERS, handlers);
  }
}
