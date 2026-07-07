import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { PluginDto } from '../dto/plugin-dto.js';
import type { PluginReadModel } from '../ports/plugin-read-model.js';
import type { GetPluginQuery } from '../queries/get-plugin-query.js';

export class GetPluginHandler implements QueryHandler<GetPluginQuery, PluginDto> {
  constructor(private readonly reads: PluginReadModel) {}

  async execute(query: GetPluginQuery): Promise<PluginDto> {
    const dto = await this.reads.findById(query.pluginId);
    if (dto === undefined) {
      throw new NotFoundError('Plugin not found', { pluginId: query.pluginId });
    }
    return dto;
  }
}
