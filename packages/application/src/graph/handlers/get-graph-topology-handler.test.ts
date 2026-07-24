import { describe, expect, it } from 'vitest';
import { GetGraphTopologyHandler } from './get-graph-topology-handler.js';
import { getGraphTopologyQuery } from '../queries/get-graph-topology-query.js';
import type { TenantId } from '@wisdum/types';
import type { GraphReadModel, GraphTopologyDto } from '../ports/graph-read-model.js';

describe('GetGraphTopologyHandler', () => {
  it('delegates topology lookup to the GraphReadModel', async () => {
    const mockTopology: GraphTopologyDto = {
      nodes: [
        {
          id: 'c1',
          label: 'Domain-Driven Design',
          type: 'concept',
          weight: 4,
          description: 'Software architecture discipline',
        },
      ],
      edges: [
        {
          source: 'c1',
          target: 'c2',
          label: 'relates_to',
          occurrenceCount: 2,
        },
      ],
    };

    const mockReadModel: GraphReadModel = {
      getTopology: async (tenantId: TenantId) => {
        expect(tenantId).toBe('tenant-123');
        return mockTopology;
      },
      getNeighbors: async () => ({ nodes: [], edges: [] }),
      getConcepts: async () => mockTopology.nodes,
      getRelationships: async () => mockTopology.edges,
    };

    const handler = new GetGraphTopologyHandler(mockReadModel);
    const result = await handler.execute(getGraphTopologyQuery('tenant-123' as unknown as TenantId));

    expect(result).toEqual(mockTopology);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges[0]?.label).toBe('relates_to');
  });
});
