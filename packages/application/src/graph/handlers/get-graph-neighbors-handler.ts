import type { QueryHandler } from '../../shared/messages.js';
import type { GraphReadModel, GraphTopologyDto } from '../ports/graph-read-model.js';
import type { GetGraphNeighborsQuery } from '../queries/get-graph-neighbors-query.js';

export class GetGraphNeighborsHandler
  implements QueryHandler<GetGraphNeighborsQuery, GraphTopologyDto>
{
  constructor(private readonly readModel: GraphReadModel) {}

  execute(query: GetGraphNeighborsQuery): Promise<GraphTopologyDto> {
    return this.readModel.getNeighbors(query.tenantId, query.conceptId, query.depth);
  }
}
