import {
  GetGraphNeighborsHandler,
  GetGraphTopologyHandler,
} from '@wisdum/application';
import { PostgresGraphReadModel } from '@wisdum/infrastructure';
import type { Container, KernelModule } from '@wisdum/kernel';
import type { TenantId } from '@wisdum/types';
import {
  CONCEPT_RELATIONSHIP_REPOSITORY,
  CONCEPT_REPOSITORY,
  GRAPH_HANDLERS,
  GRAPH_READ_MODEL,
  PG_POOL,
} from '../tokens.js';
import type { GraphHandlers } from '../tokens.js';

export class GraphModule implements KernelModule {
  readonly name = 'graph';
  readonly dependsOn = ['core', 'reasoning'];

  register(container: Container): void {
    const pool = container.resolve(PG_POOL);
    if (pool !== undefined) {
      const readModel = new PostgresGraphReadModel(pool);
      container.registerValue(GRAPH_READ_MODEL, readModel);
      const handlers: GraphHandlers = {
        getTopology: new GetGraphTopologyHandler(readModel),
        getNeighbors: new GetGraphNeighborsHandler(readModel),
      };
      container.registerValue(GRAPH_HANDLERS, handlers);
    } else {
      const concepts = container.resolve(CONCEPT_REPOSITORY);
      const relationships = container.resolve(CONCEPT_RELATIONSHIP_REPOSITORY);
      const inMemoryReadModel = {
        async getTopology(tenantId: TenantId) {
          const [cList, rList] = await Promise.all([
            concepts.listByTenant(tenantId),
            relationships.listByTenant(tenantId),
          ]);
          return {
            nodes: cList.map((c) => ({
              id: c.getId().value(),
              label: c.name.value,
              type: 'concept',
              weight: c.mentionCount,
              description: c.description.value,
            })),
            edges: rList.map((r) => ({
              source: r.conceptAId.value(),
              target: r.conceptBId.value(),
              label: r.relationshipType.value,
              occurrenceCount: r.occurrenceCount,
            })),
          };
        },
        async getNeighbors(tenantId: TenantId) {
          return this.getTopology(tenantId);
        },
        async getConcepts(tenantId: TenantId) {
          const topo = await this.getTopology(tenantId);
          return topo.nodes;
        },
        async getRelationships(tenantId: TenantId) {
          const topo = await this.getTopology(tenantId);
          return topo.edges;
        },
      };
      container.registerValue(GRAPH_READ_MODEL, inMemoryReadModel);
      container.registerValue(GRAPH_HANDLERS, {
        getTopology: new GetGraphTopologyHandler(inMemoryReadModel),
        getNeighbors: new GetGraphNeighborsHandler(inMemoryReadModel),
      });
    }
  }
}
