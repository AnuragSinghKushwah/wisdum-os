import type { QueryHandler } from '../../shared/messages.js';
import type { GraphReadModel, GraphTopologyDto } from '../ports/graph-read-model.js';
import type { GetGraphTopologyQuery } from '../queries/get-graph-topology-query.js';

export class GetGraphTopologyHandler
  implements QueryHandler<GetGraphTopologyQuery, GraphTopologyDto>
{
  constructor(private readonly readModel: GraphReadModel) {}

  execute(query: GetGraphTopologyQuery): Promise<GraphTopologyDto> {
    return this.readModel.getTopology(query.tenantId);
  }
}
