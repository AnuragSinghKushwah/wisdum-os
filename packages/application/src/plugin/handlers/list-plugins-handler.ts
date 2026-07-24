import type { QueryHandler } from '../../shared/messages.js';
import type { PluginDto } from '../dto/plugin-dto.js';
import type { PluginReadModel } from '../ports/plugin-read-model.js';
import type { ListPluginsQuery } from '../queries/list-plugins-query.js';

export class ListPluginsHandler implements QueryHandler<ListPluginsQuery, readonly PluginDto[]> {
  constructor(private readonly reads: PluginReadModel) {}

  execute(query: ListPluginsQuery): Promise<readonly PluginDto[]> {
    return this.reads.listByTenant(query.tenantId);
  }
}
