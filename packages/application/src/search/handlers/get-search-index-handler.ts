import type { QueryHandler } from '../../shared/messages.js';
import { NotFoundError } from '../../shared/errors.js';
import type { SearchIndexDto } from '../dto/search-index-dto.js';
import type { SearchIndexReadModel } from '../ports/search-index-read-model.js';
import type { GetSearchIndexQuery } from '../queries/get-search-index-query.js';

export class GetSearchIndexHandler implements QueryHandler<GetSearchIndexQuery, SearchIndexDto> {
  constructor(private readonly reads: SearchIndexReadModel) {}

  async execute(query: GetSearchIndexQuery): Promise<SearchIndexDto> {
    const dto = await this.reads.findById(query.searchIndexId);
    if (dto === undefined) {
      throw new NotFoundError('Search index not found', { searchIndexId: query.searchIndexId });
    }
    return dto;
  }
}
